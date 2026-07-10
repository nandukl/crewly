import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const InventoryDashboard = () => {
  const { activeOrganization } = useOrg();
  const [stats, setStats] = useState({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0,
    totalLocations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) fetchStats();
  }, [activeOrganization]);

  const fetchStats = async () => {
    setLoading(true);
    
    // Total Items
    const { count: itemsCount } = await supabase.from('inv_items').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganization.id);
    
    // Total Locations
    const { count: locCount } = await supabase.from('inv_locations').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganization.id);
    
    // Valuation & Low Stock
    const { data: stockData } = await supabase
      .from('inv_stock_levels')
      .select('quantity, inv_items(unit_price, min_stock_level, id)')
      .eq('organization_id', activeOrganization.id);

    let val = 0;
    const itemTotals = {}; // Aggregate qty by item
    
    if (stockData) {
      stockData.forEach(row => {
        val += (row.quantity * (row.inv_items?.unit_price || 0));
        const itemId = row.inv_items?.id;
        if (itemId) {
          if (!itemTotals[itemId]) itemTotals[itemId] = { qty: 0, min: row.inv_items.min_stock_level };
          itemTotals[itemId].qty += row.quantity;
        }
      });
    }

    let lowStock = 0;
    Object.values(itemTotals).forEach(item => {
      if (item.qty < item.min) lowStock++;
    });

    setStats({
      totalValue: val,
      totalItems: itemsCount || 0,
      totalLocations: locCount || 0,
      lowStockItems: lowStock
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-xl max-w-[1200px]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-primary-container/20 p-lg rounded-xl border border-primary/30">
          <p className="text-label-md text-primary mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            Total Valuation
          </p>
          <p className="text-display-md font-bold text-primary">{formatCurrency(stats.totalValue, activeOrganization.currency)}</p>
        </div>
        
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">category</span>
            Unique SKUs
          </p>
          <p className="text-display-md font-bold text-on-surface">{stats.totalItems}</p>
        </div>

        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            Locations
          </p>
          <p className="text-display-md font-bold text-on-surface">{stats.totalLocations}</p>
        </div>
        
        <div className={`p-lg rounded-xl border ${stats.lowStockItems > 0 ? 'bg-error-container/20 border-error/30' : 'bg-surface-container border-outline-variant'}`}>
          <p className={`text-label-md mb-xs flex items-center gap-2 ${stats.lowStockItems > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Low Stock Alerts
          </p>
          <p className={`text-display-md font-bold ${stats.lowStockItems > 0 ? 'text-error' : 'text-on-surface'}`}>{stats.lowStockItems}</p>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm text-center py-20 mt-lg">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-50">show_chart</span>
        <h3 className="font-title-lg text-on-surface">Movement Trends</h3>
        <p className="text-on-surface-variant mt-2 max-w-[500px] mx-auto">
          Detailed inventory charts, burn rates, and forecasting will be available here when the Analytics module is activated.
        </p>
      </div>
    </div>
  );
};
