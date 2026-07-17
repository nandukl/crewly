import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../../lib/aiService';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const AISetupAssistant = ({ onApplyDraft, onSkip, isModal = false }) => {
  const { activeOrganization } = useOrg();
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    const newConversation = [
      ...conversation,
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    setConversation(newConversation);
    setLoading(true);

    try {
      const response = await aiService.generateSetupDraft(newConversation, activeOrganization.id);
      
      if (response.status === 'needs_clarification') {
        setConversation([
          ...newConversation,
          { role: 'model', parts: [{ text: response.clarifying_question }] }
        ]);
      } else if (response.status === 'draft_ready') {
        setDraft(response);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach the AI assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (draft && onApplyDraft) {
      onApplyDraft(draft);
    }
  };

  if (draft) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div>
          <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Review Setup Draft</h1>
          <p className="text-on-surface-variant font-body-md">Based on your description, here is the recommended configuration.</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
          {draft.reasoning_summary && (
            <div className="p-4 bg-primary/10 text-primary rounded-xl text-sm font-medium">
              {draft.reasoning_summary}
            </div>
          )}

          <div>
            <h3 className="font-bold text-on-surface mb-3">Recommended Modules</h3>
            <div className="flex flex-wrap gap-2">
              {draft.recommended_modules?.length > 0 ? draft.recommended_modules.map((mod, i) => (
                <span key={i} className="px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-sm font-medium text-on-surface-variant">
                  {mod}
                </span>
              )) : <span className="text-sm text-on-surface-variant">None new</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-on-surface mb-3">Suggested Departments</h3>
              <ul className="space-y-2">
                {draft.suggested_departments?.length > 0 ? draft.suggested_departments.map((dept, i) => (
                  <li key={i} className="text-sm text-on-surface-variant flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {dept}
                  </li>
                )) : <li className="text-sm text-on-surface-variant">None new</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-on-surface mb-3">Leave Types</h3>
              <ul className="space-y-2">
                {draft.suggested_leave_types?.length > 0 ? draft.suggested_leave_types.map((leave, i) => (
                  <li key={i} className="text-sm text-on-surface-variant flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    {leave.name} <span className="opacity-70">({leave.description})</span>
                  </li>
                )) : <li className="text-sm text-on-surface-variant">None new</li>}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-on-surface mb-3">Salary Components</h3>
            <div className="flex flex-wrap gap-2">
              {draft.suggested_salary_components?.length > 0 ? draft.suggested_salary_components.map((comp, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${comp.type === 'allowance' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-error-container text-error border-error/30'}`}>
                  {comp.name} ({comp.type})
                </span>
              )) : <span className="text-sm text-on-surface-variant">None new</span>}
            </div>
          </div>
        </div>

        {draft.known_limitations && draft.known_limitations.length > 0 && (
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-on-surface font-medium">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">info</span>
              Just so you know
            </div>
            <ul className="list-disc pl-8 space-y-1 text-sm text-on-surface-variant">
              {draft.known_limitations.map((limitation, i) => (
                <li key={i}>{limitation}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-6 border-t border-outline-variant flex items-center justify-between">
          <Button variant="ghost" onClick={() => setDraft(null)}>Back to chat</Button>
          <div className="flex items-center gap-4">
            {!isModal && onSkip && <button onClick={onSkip} className="text-sm font-medium text-on-surface-variant hover:text-on-surface">Skip for now</button>}
            <Button onClick={handleApply}>Apply this setup</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-outline-variant rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
        <div>
          <h2 className="font-bold text-on-surface">AI Setup Assistant</h2>
          <p className="text-xs text-on-surface-variant">Describe your business to get a tailored configuration.</p>
        </div>
        {!isModal && onSkip && (
          <button onClick={onSkip} className="text-xs font-medium text-primary hover:underline">Skip to manual setup</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
        {conversation.length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">smart_toy</span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-sm p-3 text-sm text-on-surface max-w-[85%] shadow-sm">
              Hello! Tell me about your organization. What industry are you in? How many employees do you have? Do you run shifts? The more detail you provide, the better I can configure Crewly for you.
            </div>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
              <span className="material-symbols-outlined text-sm">{msg.role === 'user' ? 'person' : 'smart_toy'}</span>
            </div>
            <div className={`rounded-2xl p-3 text-sm max-w-[85%] shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-sm'}`}>
              {msg.parts[0].text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-sm p-3 text-sm text-on-surface max-w-[85%] shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
        {error && <div className="mb-2 text-xs text-error font-medium">{error}</div>}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder="e.g., We're a 40-person textile manufacturer..."
            className="flex-1 bg-white border border-outline-variant rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary shadow-sm disabled:opacity-50"
          />
          <Button type="submit" disabled={!input.trim() || loading} className="!px-4">
            <span className="material-symbols-outlined text-sm">send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
