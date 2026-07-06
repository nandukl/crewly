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
      <ul className="pl-6 mt-2 space-y-2 border-l border-slate-200">
        {children.map(node => (
          <li key={node.id} className="text-sm text-slate-700">
            <div className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded-md shadow-sm mb-2">
              <div>
                <span className="font-semibold">{node.name}</span>
                <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-1 rounded capitalize">{node.type.replace('_', ' ')}</span>
              </div>
              {canEdit && (
                <button onClick={() => handleArchive(node.id)} className="text-red-600 hover:text-red-900 text-xs">
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
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">{t.title}</h3>
      {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
      
      {canEdit && (
        <form onSubmit={handleCreate} className="mb-8 bg-slate-50 p-4 rounded-md border border-slate-200 flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700">Parent Node</label>
            <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
              <option value="">-- Root Level --</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">{t.nameLabel}</label>
            <input type="text" required value={newNodeName} onChange={e => setNewNodeName(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">{t.typeLabel}</label>
            <select value={newNodeType} onChange={e => setNewNodeType(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm sm:text-sm">
              <option value="business_unit">Business Unit</option>
              <option value="branch">Branch</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
            </select>
          </div>
          <Button type="submit">{t.addNode}</Button>
        </form>
      )}

      <div>
        {nodes.length === 0 ? (
          <p className="text-sm text-slate-500">No structure defined yet.</p>
        ) : (
          renderTree(null)
        )}
      </div>
    </div>
  );
};
