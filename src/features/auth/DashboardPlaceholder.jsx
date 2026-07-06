import React from 'react';
import { Button } from '../../components/ui/Button';
import { authService } from '../../lib/authService';
import { useNavigate } from 'react-router-dom';

export const DashboardPlaceholder = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Welcome to the Platform</h1>
        <p className="text-lg text-slate-600 mb-8">Organization creation coming soon (Module 1b).</p>
        
        <div className="flex justify-center space-x-4">
          <Button onClick={() => navigate('/sessions')} variant="outline">
            Manage Sessions
          </Button>
          <Button onClick={handleLogout} variant="danger">
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};
