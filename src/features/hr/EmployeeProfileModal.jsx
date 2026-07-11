import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { hrService } from '../../lib/hrService';
import { Button } from '../../components/ui/Button';

export const EmployeeProfileModal = ({ employee, departments, employees, isAdmin, onClose, onUpdate }) => {
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      employee_code: employee.employeeCode || '',
      designation: employee.designation || '',
      department_id: employee.departmentId || '',
      employment_type: employee.employmentType || 'Full-time',
      date_of_joining: employee.dateOfJoining || '',
      manager_id: employee.managerId || ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (data) => {
    if (!isAdmin) return; // double check
    try {
      setLoading(true);
      setError(null);
      // Clean up empty strings to null for UUIDs
      const payload = { ...data };
      if (payload.department_id === '') payload.department_id = null;
      if (payload.manager_id === '') payload.manager_id = null;

      await hrService.updateEmployeeProfile(employee.id, payload);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove ${employee.fullName || employee.email}? This will revoke their access to the workspace.`)) return;
    
    try {
      setLoading(true);
      setError(null);
      await hrService.removeEmployee(employee.membershipId);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const potentialManagers = employees.filter(e => e.id !== employee.id); // Cannot manage self

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[500px] border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <h3 className="font-title-lg text-title-lg text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary">badge</span>
            Employee Profile
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-xl overflow-y-auto space-y-xl">
          <div className="flex items-center gap-lg">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md font-bold uppercase shadow-sm flex-shrink-0">
                {employee.fullName?.charAt(0) || employee.email?.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <h4 className="font-title-lg text-title-lg font-bold text-on-surface">{employee.fullName || 'Pending User'}</h4>
              <p className="text-sm text-on-surface-variant mb-xs">{employee.email}</p>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-sm py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-high text-on-surface border border-outline-variant">
                  Role: {employee.role}
                </span>
              </div>
            </div>
          </div>

          {error && <div className="p-3 text-sm text-error bg-error-container rounded-md border border-error/20">{error}</div>}

          <form id="hr-form" onSubmit={handleSubmit(onSubmit)} className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Employee Code</label>
                <input type="text" {...register('employee_code')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low" />
              </div>
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Date of Joining</label>
                <input type="date" {...register('date_of_joining')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low" />
              </div>
            </div>

            <div className="space-y-sm">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Designation / Job Title</label>
              <input type="text" {...register('designation')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low" />
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Department</label>
                <select {...register('department_id')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low">
                  <option value="">-- None --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Employment Type</label>
                <select {...register('employment_type')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="space-y-sm">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Manager</label>
              <select {...register('manager_id')} disabled={!isAdmin} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low">
                <option value="">-- No Manager --</option>
                {potentialManagers.map(m => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.fullName || m.email} {m.designation ? `(${m.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-xl py-lg border-t border-outline-variant bg-surface-container flex justify-between gap-md mt-auto">
          <div>
            {isAdmin && employee.role !== 'owner' && (
              <Button type="button" variant="outline" onClick={handleRemove} disabled={loading} className="h-10 text-error border-error/50 hover:bg-error-container hover:border-error">
                Remove Employee
              </Button>
            )}
          </div>
          <div className="flex gap-md">
            <Button variant="outline" onClick={onClose} disabled={loading} className="h-10">Close</Button>
            {isAdmin && (
              <Button type="submit" form="hr-form" disabled={loading || !isDirty} className="h-10">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
