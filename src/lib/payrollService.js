import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';

export const payrollService = {
  // ----------------------------------------
  // Salary Structures
  // ----------------------------------------
  async getSalaryStructures(orgId) {
    try {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('Error fetching salary structures:', err);
      return { error_code: 'FETCH_ERROR', message: err.message };
    }
  },

  async createSalaryStructure(orgId, structure) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('salary_structures')
        .insert([{
          organization_id: orgId,
          name: structure.name,
          base_amount: structure.base_amount,
          allowances: structure.allowances || [],
          deductions: structure.deductions || [],
          is_active: true
        }])
        .select()
        .single();
      if (error) throw error;

      await auditLog.record('SALARY_STRUCTURE_CREATED', userData.user.id, structure, orgId, 'payroll', data.id);
      return { data };
    } catch (err) {
      console.error('Error creating salary structure:', err);
      return { error_code: 'CREATE_ERROR', message: err.message };
    }
  },

  async updateSalaryStructure(id, structure) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('salary_structures')
        .update({
          name: structure.name,
          base_amount: structure.base_amount,
          allowances: structure.allowances || [],
          deductions: structure.deductions || [],
          is_active: structure.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await auditLog.record('SALARY_STRUCTURE_UPDATED', userData.user.id, structure, data.organization_id, 'payroll', id);
      return { data };
    } catch (err) {
      console.error('Error updating salary structure:', err);
      return { error_code: 'UPDATE_ERROR', message: err.message };
    }
  },

  // ----------------------------------------
  // Employee Salary Profiles
  // ----------------------------------------
  async getEmployeeSalaryProfiles(orgId) {
    try {
      const { data, error } = await supabase
        .from('employee_salary_profiles')
        .select(`
          *,
          employee:employee_profiles(
            id, first_name, last_name, employee_id_str
          ),
          structure:salary_structures(id, name, base_amount)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active');
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('Error fetching employee salary profiles:', err);
      return { error_code: 'FETCH_ERROR', message: err.message };
    }
  },

  async assignSalaryStructure(orgId, employeeId, structureId, effectiveDate) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Deactivate old profile if exists
      await supabase
        .from('employee_salary_profiles')
        .update({ status: 'inactive' })
        .eq('employee_id', employeeId)
        .eq('status', 'active');

      const { data, error } = await supabase
        .from('employee_salary_profiles')
        .insert([{
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: structureId,
          effective_date: effectiveDate,
          status: 'active'
        }])
        .select()
        .single();
      if (error) throw error;

      await auditLog.record('SALARY_PROFILE_ASSIGNED', userData.user.id, { structure_id: structureId }, orgId, 'payroll', data.id);
      return { data };
    } catch (err) {
      console.error('Error assigning salary structure:', err);
      return { error_code: 'ASSIGN_ERROR', message: err.message };
    }
  },

  // ----------------------------------------
  // Payroll Runs & Payslips
  // ----------------------------------------
  async getPayrollRuns(orgId) {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('organization_id', orgId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('Error fetching payroll runs:', err);
      return { error_code: 'FETCH_ERROR', message: err.message };
    }
  },

  async getPayslipsForRun(runId) {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          employee:employee_profiles(
            id, first_name, last_name, employee_id_str, designation
          )
        `)
        .eq('payroll_run_id', runId);
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('Error fetching payslips:', err);
      return { error_code: 'FETCH_ERROR', message: err.message };
    }
  },

  async getMyPayslips(employeeId) {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_run:payroll_runs(period_month, period_year, status)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('Error fetching my payslips:', err);
      return { error_code: 'FETCH_ERROR', message: err.message };
    }
  },

  async generatePayrollRun(orgId, month, year) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: runId, error } = await supabase.rpc('generate_payroll_run', {
        p_org_id: orgId,
        p_month: month,
        p_year: year
      });
      if (error) throw error;

      await auditLog.record('PAYROLL_GENERATED', userData.user.id, { month, year }, orgId, 'payroll', runId);
      return { data: runId };
    } catch (err) {
      console.error('Error generating payroll run:', err);
      return { error_code: 'GENERATE_ERROR', message: err.message };
    }
  },

  async finalizePayrollRun(runId, orgId) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'finalized', updated_at: new Date().toISOString() })
        .eq('id', runId);
      if (error) throw error;

      await auditLog.record('PAYROLL_FINALIZED', userData.user.id, { run_id: runId }, orgId, 'payroll', runId);
      return { success: true };
    } catch (err) {
      console.error('Error finalizing payroll run:', err);
      return { error_code: 'FINALIZE_ERROR', message: err.message };
    }
  },

  // ----------------------------------------
  // Math & Logic Utilities
  // ----------------------------------------
  calculatePayrollPreview(profile, month, year) {
    let base = Number(profile.base_amount || 0);
    
    // Proration based on Date of Joining
    let prorationFactor = 1;
    if (profile.employee?.date_of_joining) {
      const doj = new Date(profile.employee.date_of_joining);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0); // Last day of month
      
      if (doj > periodEnd) {
        prorationFactor = 0; // Joined after this month
      } else if (doj > periodStart) {
        // Joined mid-month
        const daysInMonth = periodEnd.getDate();
        const daysWorked = daysInMonth - doj.getDate() + 1;
        prorationFactor = daysWorked / daysInMonth;
      }
    }
    
    base = base * prorationFactor;

    let allowanceTotal = 0;
    let deductionTotal = 0;

    (profile.allowances || []).forEach(item => {
      if (item.type === 'fixed') {
        allowanceTotal += Number(item.amount || 0) * prorationFactor;
      } else if (item.type === 'percentage') {
        allowanceTotal += base * (Number(item.percentage || 0) / 100);
      }
    });

    (profile.deductions || []).forEach(item => {
      if (item.type === 'fixed') {
        deductionTotal += Number(item.amount || 0) * prorationFactor;
      } else if (item.type === 'percentage') {
        deductionTotal += base * (Number(item.percentage || 0) / 100);
      }
    });

    const grossPay = base + allowanceTotal;
    const netPay = grossPay - deductionTotal;

    return {
      baseAmount: base,
      allowanceTotal,
      deductionTotal,
      grossPay,
      netPay,
      prorationFactor
    };
  }
};
