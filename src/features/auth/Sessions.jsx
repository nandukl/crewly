import React, { useState, useEffect } from 'react';
import { authService } from '../../lib/authService';
import { Button } from '../../components/ui/Button';
import en from '../../locales/en.json';
import { Monitor, Smartphone, Globe } from 'lucide-react';

export const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = en.auth.sessions;

  const [currentSessionId, setCurrentSessionId] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const sessionId = await authService.getCurrentSessionId();
      setCurrentSessionId(sessionId);
      const data = await authService.getActiveSessions();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId) => {
    try {
      await authService.revokeSession(sessionId);
      if (sessionId === currentSessionId) {
        window.location.href = '/login';
      } else {
        fetchSessions();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await authService.revokeAllOtherSessions();
      fetchSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const parseUserAgent = (ua) => {
    if (!ua) return { device: 'Unknown', icon: <Globe className="w-5 h-5 text-slate-400" /> };
    if (ua.includes('Mobile')) return { device: 'Mobile Device', icon: <Smartphone className="w-5 h-5 text-slate-400" /> };
    return { device: 'Desktop Browser', icon: <Monitor className="w-5 h-5 text-slate-400" /> };
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        {sessions.length > 1 && (
          <Button variant="outline" onClick={handleRevokeAll}>
            {t.revokeAllButton}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><span className="animate-spin text-primary">Loading...</span></div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-slate-200">
          <ul className="divide-y divide-slate-200">
            {sessions.map((session) => {
              const { device, icon } = parseUserAgent(session.user_agent);
              const isCurrent = session.session_id === currentSessionId;

              return (
                <li key={session.session_id} className="p-4 sm:px-6 hover:bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 flex items-center">
                        {device}
                        {isCurrent && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {t.currentSession}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">
                        {session.ip_address} • Last active: {new Date(session.last_active).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button variant="danger" onClick={() => handleRevoke(session.session_id)}>
                      {t.revokeButton}
                    </Button>
                  </div>
                </li>
              );
            })}
            {sessions.length === 0 && (
              <li className="p-4 text-center text-slate-500 text-sm">No active sessions found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
