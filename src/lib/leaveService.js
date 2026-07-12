import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';
import { attendanceService } from './attendanceService';

export const leaveService = {
  // --- Leave Types ---
  getLeaveTypes: async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to fetch leave types' };
    }
  },

  createLeaveType: async (organizationId, leaveTypeData) => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .insert({
          organization_id: organizationId,
          ...leaveTypeData
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await auditLog.record('LEAVE_TYPE_CREATED', organizationId, { leave_type: data });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to create leave type' };
    }
  },

  updateLeaveType: async (leaveTypeId, leaveTypeData) => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .update(leaveTypeData)
        .eq('id', leaveTypeId)
        .select()
        .single();
        
      if (error) throw error;

      await auditLog.record('LEAVE_TYPE_UPDATED', data.organization_id, { leave_type: data });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to update leave type' };
    }
  },

  // --- Leave Balances ---
  getBalances: async (organizationId, employeeId) => {
    try {
      const { data, error } = await supabase
        .from('leave_balances_view')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId);
        
      if (error) throw error;
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to fetch leave balances' };
    }
  },

  grantLeave: async (organizationId, employeeId, leaveTypeId, amount, description) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployeeId } = await supabase.rpc('get_current_employee_id', { p_org_id: organizationId });

      const { data, error } = await supabase
        .from('leave_balance_transactions')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          transaction_type: amount >= 0 ? 'Accrual' : 'Deduction', // Or Adjustment
          amount: amount,
          description: description,
          created_by: currentEmployeeId
        })
        .select()
        .single();
        
      if (error) throw error;

      await auditLog.record('LEAVE_BALANCE_ADJUSTED', employeeId, { transaction: data });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to grant leave' };
    }
  },

  // --- Leave Requests ---
  submitRequest: async (organizationId, employeeId, requestData) => {
    try {
      // 1. Check leave type configuration (e.g. requires approval?)
      const { data: leaveType } = await supabase
        .from('leave_types')
        .select('*')
        .eq('id', requestData.leave_type_id)
        .single();
        
      // 2. Insert request
      const status = leaveType?.requires_approval ? 'Pending' : 'Approved';
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          leave_type_id: requestData.leave_type_id,
          start_date: requestData.start_date,
          end_date: requestData.end_date,
          days_count: requestData.days_count,
          reason: requestData.reason,
          status: status,
          approver_id: status === 'Approved' ? user.id : null,
          approved_at: status === 'Approved' ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('LEAVE_REQUEST_SUBMITTED', employeeId, { request: data });

      // If auto-approved, deduct balance immediately
      if (status === 'Approved') {
        await leaveService._processApprovedLeave(data, user.id);
      }

      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to submit leave request' };
    }
  },

  getRequests: async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to fetch leave requests' };
    }
  },

  getPendingRequests: async (organizationId) => {
    try {
      // For managers/admins
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(name),
          employee_profiles(
            id,
            memberships ( user_id, email )
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'Pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Manually fetch user profiles since memberships has no direct FK to user_profiles yet
      const userIds = data.map(req => req.employee_profiles?.memberships?.user_id).filter(Boolean);
      let userProfiles = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);
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
      throw { message: error.message || 'Failed to fetch pending requests' };
    }
  },

  approveRequest: async (requestId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: request, error: fetchErr } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchErr) throw fetchErr;
      if (request.status !== 'Pending') throw new Error('Request is not pending.');

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Approved',
          approver_id: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      await leaveService._processApprovedLeave(data, user.id);
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to approve request' };
    }
  },

  rejectRequest: async (requestId, reason) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Rejected',
          approver_id: user.id,
          rejection_reason: reason,
          approved_at: new Date().toISOString() // Using this as resolved_at
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      await auditLog.record('LEAVE_REQUEST_REJECTED', data.employee_id, { request_id: requestId, reason });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to reject request' };
    }
  },

  cancelRequest: async (requestId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      
      const { data: request, error: fetchErr } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchErr) throw fetchErr;

      if (request.status !== 'Approved' && request.status !== 'Pending') throw new Error('Cannot cancel this request.');
      if (request.employee_id !== user.id) {
        // Technically admin can cancel too, but simplified for now
      }

      const { data: currentEmployeeId } = await supabase.rpc('get_current_employee_id', { p_org_id: request.organization_id });

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'Cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // 2. If it was approved, refund the balance
      if (request.status === 'Approved') {
        await supabase
          .from('leave_balance_transactions')
          .insert({
            organization_id: request.organization_id,
            employee_id: request.employee_id,
            leave_type_id: request.leave_type_id,
            transaction_type: 'Adjustment',
            amount: request.days_count, // Positive amount restores the deduction
            reference_id: requestId,
            description: 'Cancelled leave request restoration',
            created_by: currentEmployeeId
          });
          
        // Note: Retracting attendance events is tricky (which days were marked 'On Leave'?)
        // For v1, we leave a note or manually handle attendance cleanup, or we can iterate days and reset them.
      }

      await auditLog.record('LEAVE_REQUEST_CANCELLED', request.employee_id, { request_id: requestId });
      return data;
    } catch (error) {
      throw { message: error.message || 'Failed to cancel request' };
    }
  },

  // Internal helper to deduct balance and mark attendance
  _processApprovedLeave: async (requestData, userId) => {
    const { data: currentEmployeeId } = await supabase.rpc('get_current_employee_id', { p_org_id: requestData.organization_id });
    
    // 1. Deduct balance
    const { error: balanceErr } = await supabase
      .from('leave_balance_transactions')
      .insert({
        organization_id: requestData.organization_id,
        employee_id: requestData.employee_id,
        leave_type_id: requestData.leave_type_id,
        transaction_type: 'Deduction',
        amount: -Math.abs(requestData.days_count),
        reference_id: requestData.id,
        description: 'Leave request approved',
        created_by: currentEmployeeId
      });

    // 2. Mark Attendance for each day
    // This is a naive implementation: it assumes continuous days including weekends.
    // A robust version would skip non-working days defined in attendance_policies.
    let currentDate = new Date(requestData.start_date);
    const endDate = new Date(requestData.end_date);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      await attendanceService.logManualEntry(requestData.organization_id, requestData.employee_id, {
        date: dateStr,
        clock_in_time: null,
        clock_out_time: null,
        status: 'On Leave',
        is_incomplete: false
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await auditLog.record('LEAVE_REQUEST_APPROVED', requestData.employee_id, { request_id: requestData.id });
  },

  // --- Math & Logic Utilities ---
  calculateNewLeaveBalance: (currentBalance, transaction) => {
    let amount = Number(transaction.amount || 0);
    const type = transaction.transaction_type;

    if (type === 'Deduction') {
      amount = -Math.abs(amount); // Deductions should always subtract
    } else if (type === 'Accrual') {
      amount = Math.abs(amount); // Accruals should always add
    } // Adjustment can be positive or negative

    return Number(currentBalance || 0) + amount;
  }
};
