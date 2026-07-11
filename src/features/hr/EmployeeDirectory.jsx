import React, { useState, useEffect } from 'react';
import { hrService } from '../../lib/hrService';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { CreateEmployeeModal } from './CreateEmployeeModal';

export const EmployeeDirectory = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  const fetchData = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const [empData, deptData] = await Promise.all([
        hrService.getEmployeeDirectory(activeOrganization.id),
        hrService.getDepartments(activeOrganization.id)
      ]);
      setEmployees(empData);
      setDepartments(deptData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrganization]);

  if (loading) return <div className="py-8">Loading directory...</div>;
  if (error) return <div className="py-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Directory</h2>
          <p className="text-slate-500 mt-1">View and manage all employees in {activeOrganization.name}.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">person_add</span>
            Create Employee
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-slate-200">
          {employees.filter(emp => emp.status !== 'removed').map((emp) => (
            <li key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
              <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {emp.avatarUrl ? (
                      <img className="h-10 w-10 rounded-full object-cover" src={emp.avatarUrl} alt="" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                        {emp.fullName?.charAt(0) || emp.email?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-blue-600 truncate">{emp.fullName || (emp.status === 'pending_invitation' ? 'Pending Member' : emp.email?.split('@')[0])}</div>
                    <div className="text-sm text-slate-500 truncate">{emp.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm text-slate-900">{emp.designation || 'No Designation'}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    {emp.departmentName || 'No Department'}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${emp.status === 'active' ? 'bg-green-100 text-green-800' : emp.status === 'removed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {emp.status}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {employees.length === 0 && (
          <div className="p-8 text-center text-slate-500">No employees found. Invite some members first!</div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeProfileModal 
          employee={selectedEmployee} 
          departments={departments}
          employees={employees}
          isAdmin={isAdmin}
          onClose={() => setSelectedEmployee(null)} 
          onUpdate={() => {
            fetchData();
          }}
        />
      )}

      {showCreateModal && (
        <CreateEmployeeModal 
          activeOrganization={activeOrganization}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};
