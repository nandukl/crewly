import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';

export const attendanceService = {
  // --- Policy Management ---
  getPolicy: async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
        organization_id: organizationId,
        working_hours_per_day: 8.0,
        work_week_pattern: [1, 2, 3, 4, 5],
        entry_methods: ['clock_in_out', 'manual'],
        regularization_window_days: 7
      };
    } catch (error) {
      throw { message: error.message || 'Failed to fetch attendance policy' };
    }
  },

  updatePolicy: async (organizationId, policyData) => {
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .upsert({ organization_id: organizationId, ...policyData })
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('ATTENDANCE_POLICY_UPDATED', organizationId, { policy: data });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to update attendance policy' };
    }
  },

  // --- Record Management ---
  getRecords: async (employeeId, startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to fetch attendance records' };
    }
  },

  clockIn: async (organizationId, employeeId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Check if already clocked in
      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_records')
        .select('id, clock_in_time')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();

      if (existing && existing.clock_in_time) {
        throw new Error('Already clocked in today.');
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          date: today,
          clock_in_time: now,
          status: 'Present',
          is_incomplete: true,
          entry_method: 'clock_in_out'
        })
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('ATTENDANCE_CLOCKED_IN', employeeId, { record_id: data.id, time: now });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to clock in' };
    }
  },

  clockOut: async (employeeId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();

      if (!existing || existing.clock_out_time) {
        throw new Error('No active clock-in found or already clocked out.');
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          clock_out_time: now,
          is_incomplete: false
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('ATTENDANCE_CLOCKED_OUT', employeeId, { record_id: data.id, time: now });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to clock out' };
    }
  },

  logManualEntry: async (organizationId, employeeId, recordData) => {
    try {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', recordData.date)
        .single();

      let query;
      if (existing) {
        query = supabase
          .from('attendance_records')
          .update({
            clock_in_time: recordData.clock_in_time,
            clock_out_time: recordData.clock_out_time,
            status: recordData.status,
            is_incomplete: recordData.is_incomplete || false,
            entry_method: 'manual',
            history: [...(existing.history || []), { ...existing, changed_at: new Date().toISOString() }]
          })
          .eq('id', existing.id);
      } else {
        query = supabase
          .from('attendance_records')
          .insert({
            organization_id: organizationId,
            employee_id: employeeId,
            date: recordData.date,
            clock_in_time: recordData.clock_in_time,
            clock_out_time: recordData.clock_out_time,
            status: recordData.status,
            is_incomplete: recordData.is_incomplete || false,
            entry_method: 'manual'
          });
      }

      const { data, error } = await query.select().single();
      if (error) throw error;

      await auditLog.record('ATTENDANCE_MANUAL_ENTRY', employeeId, { record: data });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to log manual entry' };
    }
  },

  // --- Corrections ---
  requestCorrection: async (organizationId, recordId, employeeId, date, correctionData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('attendance_corrections')
        .insert({
          organization_id: organizationId,
          attendance_record_id: recordId, // can be null if creating a new absent->present record
          employee_id: employeeId,
          date: date,
          requester_id: user.id,
          reason: correctionData.reason,
          proposed_clock_in: correctionData.proposed_clock_in,
          proposed_clock_out: correctionData.proposed_clock_out,
          proposed_status: correctionData.proposed_status
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to request correction' };
    }
  },

  getPendingCorrections: async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('attendance_corrections')
        .select(`
          *,
          employee_profiles(
            id,
            memberships(user_id, email)
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const userIds = data.map(req => req.employee_profiles?.memberships?.user_id).filter(Boolean);
      let userProfiles = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, email').in('id', userIds);
        if (profiles) userProfiles = profiles;
      }
      
      return data.map(req => {
         const userProfile = userProfiles.find(p => p.id === req.employee_profiles?.memberships?.user_id);
         return {
            ...req,
            employee_profiles: {
               ...req.employee_profiles,
               full_name: userProfile?.full_name || 'Unknown User',
               email: userProfile?.email || req.employee_profiles?.memberships?.email
            }
         };
      });
    } catch (error) {
      throw { message: error.message || 'Failed to fetch pending corrections' };
    }
  },

  approveCorrection: async (correctionId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Get the correction
      const { data: correction, error: fetchErr } = await supabase
        .from('attendance_corrections')
        .select('*')
        .eq('id', correctionId)
        .single();
        
      if (fetchErr) throw fetchErr;

      // 2. Update the main record (with history) or insert it if missing
      await attendanceService.logManualEntry(correction.organization_id, correction.employee_id, {
        date: correction.date,
        clock_in_time: correction.proposed_clock_in,
        clock_out_time: correction.proposed_clock_out,
        status: correction.proposed_status,
        is_incomplete: false
      });

      // 3. Mark correction as approved
      const { data, error } = await supabase
        .from('attendance_corrections')
        .update({
          status: 'Approved',
          approver_id: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', correctionId)
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('ATTENDANCE_CORRECTION_APPROVED', correction.employee_id, { correction_id: correctionId });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to approve correction' };
    }
  },

  rejectCorrection: async (correctionId, reason) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('attendance_corrections')
        .update({
          status: 'Rejected',
          approver_id: user.id,
          rejection_reason: reason,
          approved_at: new Date().toISOString()
        })
        .eq('id', correctionId)
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('ATTENDANCE_CORRECTION_REJECTED', data.employee_id, { correction_id: correctionId });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to reject correction' };
    }
  }
};
