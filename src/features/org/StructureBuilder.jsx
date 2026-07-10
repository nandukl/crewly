import React, { useState, useEffect } from 'react';
import { useOrg } from './OrgContext';
import { orgService } from '../../lib/orgService';
import { Button } from '../../components/ui/Button';
import en from '../../locales/en.json';

export const StructureBuilder = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('department');
  const [selectedParentId, setSelectedParentId] = useState('');

  const t = en.org.structure;
  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  useEffect(() => {
    if (activeOrganization) {
      loadNodes();
    }
  }, [activeOrganization]);

  const loadNodes = async () => {
    try {
      const data = await orgService.getStructureNodes(activeOrganization.id);
      setNodes(data.filter(n => n.status === 'active'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      setError('');
      await orgService.createStructureNode(activeOrganization.id, selectedParentId || null, newNodeName, newNodeType);
      setNewNodeName('');
      await loadNodes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchive = async (nodeId) => {
    if (!canEdit) return;
    try {
      setError('');
      await orgService.archiveStructureNode(nodeId);
      await loadNodes();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading structure...</div>;

  const renderTree = (parentId) => {
    const children = nodes.filter(n => (n.parent_id === parentId) || (!n.parent_id && !parentId));
    if (children.length === 0) return null;

    return (
      <ul className="pl-lg mt-md space-y-md border-l-2 border-outline-variant">
        {children.map(node => (
          <li key={node.id} className="relative">
            <div className="absolute -left-[calc(var(--spacing-lg)+2px)] top-1/2 w-lg border-t-2 border-outline-variant -translate-y-1/2"></div>
            <div className="flex items-center justify-between bg-surface-container-lowest p-md border border-outline-variant rounded-lg shadow-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-bold text-on-surface">{node.name}</span>
                <span className="text-[10px] text-on-surface-variant font-code-sm uppercase tracking-widest">{node.type.replace('_', ' ')}</span>
              </div>
              {canEdit && (
                <button onClick={() => handleArchive(node.id)} className="text-error hover:text-red-900 font-label-md text-xs font-bold transition-colors">
                  {t.archive}
                </button>
              )}
            </div>
            {renderTree(node.id)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="max-w-4xl space-y-xl">
      <div className="space-y-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{t.title}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Manage your organization's hierarchy and departments.</p>
      </div>

      {error && <div className="p-3 text-sm text-error bg-error-container rounded-md">{error}</div>}
      
      {canEdit && (
        <form onSubmit={handleCreate} className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm space-y-lg">
          <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary">account_tree</span>
            Add New Node
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg items-end">
            <div className="col-span-1 md:col-span-3 space-y-sm">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Parent Node</label>
              <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface bg-white">
                <option value="">-- Root Level --</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-4 space-y-sm">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t.nameLabel}</label>
              <input type="text" required placeholder="e.g. Engineering" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface bg-white" />
            </div>
            
            <div className="col-span-1 md:col-span-3 space-y-sm">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t.typeLabel}</label>
              <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)} className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface bg-white">
                <option value="business_unit">Business Unit</option>
                <option value="branch">Branch</option>
                <option value="department">Department</option>
                <option value="team">Team</option>
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Button type="submit" className="w-full h-12">{t.addNode}</Button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
        <h2 className="font-title-lg text-title-lg text-on-surface mb-lg flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary">lan</span>
          Current Structure
        </h2>
        
        {nodes.length === 0 ? (
          <div className="p-xl text-center bg-surface-container rounded-lg border border-dashed border-outline-variant">
            <p className="font-body-md text-on-surface-variant">No structure defined yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {renderTree(null)}
          </div>
        )}
      </div>
    </div>
  );
};

