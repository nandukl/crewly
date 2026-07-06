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

  const potentialManagers = employees.filter(e => e.id !== employee.id); // Cannot manage self

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-900">Employee Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl uppercase">
                {employee.fullName?.charAt(0) || employee.email?.charAt(0)}
              </div>
            )}
            <div>
              <h4 className="text-xl font-bold text-slate-900">{employee.fullName || 'Pending User'}</h4>
              <p className="text-sm text-slate-500">{employee.email}</p>
              <div className="mt-1 flex gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                  Role: {employee.role}
                </span>
              </div>
            </div>
          </div>

          {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}

          <form id="hr-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee Code</label>
                <input type="text" {...register('employee_code')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date of Joining</label>
                <input type="date" {...register('date_of_joining')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Designation / Job Title</label>
              <input type="text" {...register('designation')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Department</label>
                <select {...register('department_id')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50">
                  <option value="">-- None --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Employment Type</label>
                <select {...register('employment_type')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Manager</label>
              <select {...register('manager_id')} disabled={!isAdmin} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-50">
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Close</Button>
          {isAdmin && (
            <Button type="submit" form="hr-form" disabled={loading || !isDirty}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
