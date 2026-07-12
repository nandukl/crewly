import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export const CreateEmployeeModal = ({ activeOrganization, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.password) {
        throw new Error("Please generate or enter a password for the employee.");
      }

      // Call the secure RPC function to create the employee
      const { data, error: rpcError } = await supabase.rpc('create_employee_account', {
        org_id: activeOrganization.id,
        emp_email: formData.email,
        emp_password: formData.password,
        emp_name: formData.name,
        emp_role: formData.role
      });

      if (rpcError) throw rpcError;

      // 2. Send email via Resend
      const loginUrl = `http://${activeOrganization.slug}.localhost:5173/login`;
      const { error: fnError } = await supabase.functions.invoke('dispatch-notification', {
        body: {
          type: 'employee_welcome',
          recipient_email: formData.email,
          organization_id: activeOrganization.id,
          title: `Welcome to ${activeOrganization.name} on Crewly`,
          message: `Login URL: ${loginUrl}\nEmail: ${formData.email}\nTemporary Password: ${formData.password}\n\nPlease log in and change your password immediately.`,
          action_url: loginUrl,
          channels: ['email']
        }
      });
      if (fnError) console.error('Failed to dispatch welcome email:', fnError);

      // Success! Show the password to the admin so they can share it
      setGeneratedPassword(formData.password);
      if (onSuccess) onSuccess();
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create employee account');
      setLoading(false);
    }
  };

  if (generatedPassword) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl w-full max-w-md p-6 shadow-xl border border-outline-variant">
          <div className="flex items-center gap-3 text-green-600 mb-4">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
            <h2 className="font-headline-sm text-xl font-bold">Employee Created</h2>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6">
            <p className="text-sm text-on-surface-variant mb-2">
              An email containing these credentials has been dispatched via Resend to <strong>{formData.email}</strong>. 
            </p>
            <div className="space-y-3 mt-4">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Email</span>
                <div className="font-mono text-on-surface bg-surface-container p-2 rounded">{formData.email}</div>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Temporary Password</span>
                <div className="font-mono text-on-surface bg-surface-container p-2 rounded select-all">{generatedPassword}</div>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2 bg-primary text-on-primary rounded-lg font-bold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-headline-sm text-lg font-bold text-on-surface">Add Employee</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm mb-6 flex items-start gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <form id="create-employee-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Full Name</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Work Email</label>
              <input 
                type="email" required
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Workspace Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="org_admin">Workspace Admin</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-bold text-on-surface">Temporary Password</label>
                <button type="button" onClick={generatePassword} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">autorenew</span>
                  Generate
                </button>
              </div>
              <input 
                type="text" required
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder="Click generate or type a secure password"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-mono"
              />
              <p className="text-xs text-on-surface-variant mt-1">You will need to share this password with the employee securely.</p>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest rounded-b-2xl flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="create-employee-form"
            disabled={loading}
            className="px-4 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span> : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  );
};
