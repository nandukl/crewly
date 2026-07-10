import React, { useState, useEffect } from 'react';
import { payrollService } from '../../lib/payrollService';
import { hrService } from '../../lib/hrService';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

export const SalaryStructures = ({ activeOrganization }) => {
  const [structures, setStructures] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for creating/editing structure
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState({ name: '', base_amount: '', allowances: [], deductions: [], is_active: true });
  
  // State for assignment
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignData, setAssignData] = useState({ employee_id: '', salary_structure_id: '', effective_date: '' });

  useEffect(() => {
    if (activeOrganization) fetchData();
  }, [activeOrganization]);

  const fetchData = async () => {
    setLoading(true);
    const [structRes, profRes, empRes] = await Promise.all([
      payrollService.getSalaryStructures(activeOrganization.id),
      payrollService.getEmployeeSalaryProfiles(activeOrganization.id),
      hrService.getEmployees(activeOrganization.id)
    ]);
    if (!structRes.error_code) setStructures(structRes.data || []);
    if (!profRes.error_code) setProfiles(profRes.data || []);
    if (!empRes.error_code) setEmployees(empRes.data || []);
    setLoading(false);
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    if (editingStructure.id) {
      await payrollService.updateSalaryStructure(editingStructure.id, editingStructure);
    } else {
      await payrollService.createSalaryStructure(activeOrganization.id, editingStructure);
    }
    setShowStructureForm(false);
    fetchData();
  };

  const handleAssignStructure = async (e) => {
    e.preventDefault();
    await payrollService.assignSalaryStructure(
      activeOrganization.id, 
      assignData.employee_id, 
      assignData.salary_structure_id, 
      assignData.effective_date
    );
    setShowAssignForm(false);
    fetchData();
  };

  const addAllowance = () => {
    setEditingStructure(prev => ({
      ...prev,
      allowances: [...prev.allowances, { name: '', amount: 0, type: 'fixed' }]
    }));
  };

  const updateAllowance = (index, field, value) => {
    const newArr = [...editingStructure.allowances];
    newArr[index][field] = value;
    setEditingStructure({ ...editingStructure, allowances: newArr });
  };

  const addDeduction = () => {
    setEditingStructure(prev => ({
      ...prev,
      deductions: [...prev.deductions, { name: '', percentage: 0, type: 'percentage' }]
    }));
  };

  const updateDeduction = (index, field, value) => {
    const newArr = [...editingStructure.deductions];
    newArr[index][field] = value;
    setEditingStructure({ ...editingStructure, deductions: newArr });
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant">Loading compensation data...</div>;

  return (
    <div className="space-y-xl max-w-7xl">
      {/* Salary Structures Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface">Compensation Bands</h3>
            <p className="text-sm text-on-surface-variant mt-1">Define base salaries and standard allowances.</p>
          </div>
          <Button onClick={() => {
            setEditingStructure({ name: '', base_amount: '', allowances: [], deductions: [], is_active: true });
            setShowStructureForm(true);
          }}>Create New Band</Button>
        </div>

        {showStructureForm && (
          <div className="p-xl bg-surface-container-lowest border-b border-outline-variant">
            <form onSubmit={handleSaveStructure} className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Band Name</label>
                  <input type="text" required value={editingStructure.name} onChange={e => setEditingStructure({...editingStructure, name: e.target.value})} className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring" placeholder="e.g. L4 Engineer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Base Amount</label>
                  <input type="number" required min="0" step="0.01" value={editingStructure.base_amount} onChange={e => setEditingStructure({...editingStructure, base_amount: e.target.value})} className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring" />
                </div>
              </div>

              {/* Allowances */}
              <div className="pt-sm">
                <div className="flex justify-between items-center mb-sm">
                  <h4 className="font-medium text-on-surface">Allowances</h4>
                  <button type="button" onClick={addAllowance} className="text-primary text-sm font-medium hover:underline">+ Add Allowance</button>
                </div>
                {editingStructure.allowances.map((al, idx) => (
                  <div key={idx} className="flex gap-sm mb-2 items-center bg-surface-container-highest p-2 rounded-lg">
                    <input type="text" placeholder="Name (e.g. HRA)" value={al.name} onChange={e => updateAllowance(idx, 'name', e.target.value)} className="flex-1 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm" />
                    <select value={al.type} onChange={e => updateAllowance(idx, 'type', e.target.value)} className="w-32 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm">
                      <option value="fixed">Fixed ($)</option>
                      <option value="percentage">% of Base</option>
                    </select>
                    <input type="number" placeholder={al.type === 'fixed' ? 'Amount' : 'Percentage'} value={al.type === 'fixed' ? al.amount : al.percentage} onChange={e => updateAllowance(idx, al.type === 'fixed' ? 'amount' : 'percentage', e.target.value)} className="w-32 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm" />
                    <button type="button" onClick={() => setEditingStructure(prev => ({...prev, allowances: prev.allowances.filter((_, i) => i !== idx)}))} className="text-error mx-2"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div className="pt-sm border-t border-outline-variant">
                <div className="flex justify-between items-center mb-sm">
                  <h4 className="font-medium text-on-surface">Deductions</h4>
                  <button type="button" onClick={addDeduction} className="text-error text-sm font-medium hover:underline">+ Add Deduction</button>
                </div>
                {editingStructure.deductions.map((ded, idx) => (
                  <div key={idx} className="flex gap-sm mb-2 items-center bg-error-container/20 p-2 rounded-lg border border-error/10">
                    <input type="text" placeholder="Name (e.g. Income Tax)" value={ded.name} onChange={e => updateDeduction(idx, 'name', e.target.value)} className="flex-1 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm" />
                    <select value={ded.type} onChange={e => updateDeduction(idx, 'type', e.target.value)} className="w-32 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm">
                      <option value="fixed">Fixed ($)</option>
                      <option value="percentage">% of Base</option>
                    </select>
                    <input type="number" placeholder={ded.type === 'fixed' ? 'Amount' : 'Percentage'} value={ded.type === 'fixed' ? ded.amount : ded.percentage} onChange={e => updateDeduction(idx, ded.type === 'fixed' ? 'amount' : 'percentage', e.target.value)} className="w-32 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm" />
                    <button type="button" onClick={() => setEditingStructure(prev => ({...prev, deductions: prev.deductions.filter((_, i) => i !== idx)}))} className="text-error mx-2"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-md pt-md">
                <Button variant="secondary" onClick={() => setShowStructureForm(false)}>Cancel</Button>
                <Button type="submit">Save Compensation Band</Button>
              </div>
            </form>
          </div>
        )}

        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container">
            <tr>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase">Band Name</th>
              <th className="px-xl py-md text-right text-xs font-bold text-on-surface-variant uppercase">Base Salary</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase">Components</th>
              <th className="px-xl py-md text-center text-xs font-bold text-on-surface-variant uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {structures.map(s => (
              <tr key={s.id} className="hover:bg-surface-container/50 cursor-pointer" onClick={() => { setEditingStructure(s); setShowStructureForm(true); }}>
                <td className="px-xl py-md text-sm font-medium text-on-surface">{s.name}</td>
                <td className="px-xl py-md text-sm text-right font-mono">{formatCurrency(s.base_amount, activeOrganization.currency, false)}</td>
                <td className="px-xl py-md text-sm text-on-surface-variant">
                  {s.allowances?.length || 0} Allowances, {s.deductions?.length || 0} Deductions
                </td>
                <td className="px-xl py-md text-center">
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${s.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
            {structures.length === 0 && (
              <tr><td colSpan="4" className="px-xl py-lg text-center text-on-surface-variant">No salary structures defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assigned Profiles */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface">Employee Compensation</h3>
            <p className="text-sm text-on-surface-variant mt-1">Active salary band assignments.</p>
          </div>
          <Button onClick={() => {
            setAssignData({ employee_id: '', salary_structure_id: '', effective_date: new Date().toISOString().split('T')[0] });
            setShowAssignForm(true);
          }}>Assign Structure</Button>
        </div>

        {showAssignForm && (
           <div className="p-xl bg-surface-container-lowest border-b border-outline-variant">
             <form onSubmit={handleAssignStructure} className="flex gap-md items-end">
               <div className="flex-1">
                 <label className="block text-sm font-medium text-on-surface mb-1">Employee</label>
                 <select required value={assignData.employee_id} onChange={e => setAssignData({...assignData, employee_id: e.target.value})} className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring">
                   <option value="">Select Employee...</option>
                   {employees.map(emp => (
                     <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_id_str})</option>
                   ))}
                 </select>
               </div>
               <div className="flex-1">
                 <label className="block text-sm font-medium text-on-surface mb-1">Salary Band</label>
                 <select required value={assignData.salary_structure_id} onChange={e => setAssignData({...assignData, salary_structure_id: e.target.value})} className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring">
                   <option value="">Select Band...</option>
                   {structures.filter(s => s.is_active).map(s => (
                     <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.base_amount, activeOrganization.currency, false)})</option>
                   ))}
                 </select>
               </div>
               <div className="w-48">
                 <label className="block text-sm font-medium text-on-surface mb-1">Effective Date</label>
                 <input type="date" required value={assignData.effective_date} onChange={e => setAssignData({...assignData, effective_date: e.target.value})} className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring" />
               </div>
               <div>
                 <Button type="submit">Assign</Button>
               </div>
               <div>
                 <Button type="button" variant="secondary" onClick={() => setShowAssignForm(false)}>Cancel</Button>
               </div>
             </form>
           </div>
        )}

        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container">
            <tr>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase">Employee</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase">Assigned Band</th>
              <th className="px-xl py-md text-right text-xs font-bold text-on-surface-variant uppercase">Base Pay</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase">Effective From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-surface-container/50">
                <td className="px-xl py-md text-sm font-medium text-on-surface">
                  {p.employee?.first_name} {p.employee?.last_name}
                  <div className="text-xs text-on-surface-variant font-mono">{p.employee?.employee_id_str}</div>
                </td>
                <td className="px-xl py-md text-sm text-primary font-medium">
                  {p.structure?.name}
                </td>
                <td className="px-xl py-md text-sm text-on-surface-variant text-right font-mono">
                  {p.structure ? formatCurrency(p.structure.base_amount, activeOrganization.currency, false) : '-'}
                </td>
                <td className="px-xl py-md text-sm text-on-surface-variant">
                  {new Date(p.effective_date).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr><td colSpan="4" className="px-xl py-lg text-center text-on-surface-variant">No salary profiles assigned.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
