import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const HRReports = () => {
  const { activeOrganization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalHeadcount: 0,
    totalAnnualPayroll: 0,
    deptCounts: []
  });

  useEffect(() => {
    if (activeOrganization) fetchHRData();
  }, [activeOrganization]);

  const fetchHRData = async () => {
    setLoading(true);
    
    // 1. Employee list with salary
    const { data: emps } = await supabase
      .from('user_profiles')
      .select('department, prl_salary_structures(annual_salary)')
      .eq('organization_id', activeOrganization.id);
      
    let hc = 0;
    let annualPayroll = 0;
    let deptMap = {};
    
    if (emps) {
      hc = emps.length;
      emps.forEach(emp => {
        // Payroll
        if (emp.prl_salary_structures && emp.prl_salary_structures.length > 0) {
          annualPayroll += Number(emp.prl_salary_structures[0].annual_salary || 0);
        }
        
        // Departments
        const d = emp.department || 'Unassigned';
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
    }
    
    const dCounts = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setData({
      totalHeadcount: hc,
      totalAnnualPayroll: annualPayroll,
      deptCounts: dCounts
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading HR reports...</div>;

  const avgSalary = data.totalHeadcount > 0 ? data.totalAnnualPayroll / data.totalHeadcount : 0;

  return (
    <div className="space-y-lg max-w-[1000px]">
      <h2 className="font-title-lg text-title-lg text-on-surface">People & Culture (HR)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Total Headcount</p>
          <p className="text-headline-md font-bold text-on-surface">{data.totalHeadcount}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Total Annual Payroll (Base)</p>
          <p className="text-headline-md font-bold text-on-surface">{formatCurrency(data.totalAnnualPayroll, activeOrganization.currency)}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Avg Base Salary</p>
          <p className="text-headline-md font-bold text-on-surface">{formatCurrency(avgSalary, activeOrganization.currency)}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
        <h3 className="font-title-md font-bold text-on-surface mb-md">Headcount by Department</h3>
        <div className="space-y-4">
          {data.deptCounts.map((dept, index) => {
            const percentage = data.totalHeadcount > 0 ? (dept.count / data.totalHeadcount) * 100 : 0;
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-on-surface">{dept.name}</span>
                  <span className="text-on-surface-variant">{dept.count} members ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
