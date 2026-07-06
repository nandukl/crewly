import React, { useState, useEffect } from 'react';
import { auditLog } from '../../lib/auditLog';
import { useOrg } from '../org/OrgContext';

export const AuditLogViewer = () => {
  const { activeOrganization } = useOrg();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization?.id) {
      loadLogs(activeOrganization.id);
    }
  }, [activeOrganization?.id]);

  const loadLogs = async (orgId) => {
    setLoading(true);
    const data = await auditLog.getOrgAuditLogs(orgId);
    setLogs(data);
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-slate-500">Loading audit logs...</div>;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Audit Logs</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Immutable record of all state-changing actions in this organization.
          </p>
        </div>
        <button
          onClick={() => loadLogs(activeOrganization.id)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No audit logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event / Action</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata (JSON)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      log.event_type.startsWith('DB_DELETE') ? 'bg-red-100 text-red-800' :
                      log.event_type.startsWith('DB_INSERT') ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    <div className="font-medium">{log.entity_type || '-'}</div>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate" title={log.entity_id}>{log.entity_id || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-mono break-all max-w-sm">
                    <details className="cursor-pointer">
                      <summary>View Payload</summary>
                      <pre className="mt-2 p-2 bg-slate-50 rounded border overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
