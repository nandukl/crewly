import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export const ReviewDetails = ({ review, onBack, isManager }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Local state for the review form
  const [selfScore, setSelfScore] = useState(review.self_score || '');
  const [managerScore, setManagerScore] = useState(review.manager_score || '');
  const [comments, setComments] = useState(review.comments || '');

  // Local state for adding a goal
  const [newGoal, setNewGoal] = useState({ title: '', description: '' });
  const [showAddGoal, setShowAddGoal] = useState(false);

  // Status flags
  const canEditSelf = !isManager && review.status === 'Pending Self-Review';
  const canEditManager = isManager && review.status === 'Pending Manager Review';
  const isCompleted = review.status === 'Completed';

  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('performance_goals')
        .select('*')
        .eq('review_id', review.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setGoals(data);
      }
      setLoading(false);
    };

    fetchGoals();
  }, [review.id]);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('performance_goals')
      .insert({
        review_id: review.id,
        title: newGoal.title,
        description: newGoal.description
      })
      .select()
      .single();

    if (!error && data) {
      setGoals([...goals, data]);
      setNewGoal({ title: '', description: '' });
      setShowAddGoal(false);
    } else {
      console.error(error);
      alert('Failed to add goal');
    }
  };

  const handleUpdateGoalRating = async (goalId, ratingField, value) => {
    const { error } = await supabase
      .from('performance_goals')
      .update({ [ratingField]: value })
      .eq('id', goalId);
      
    if (!error) {
      setGoals(goals.map(g => g.id === goalId ? { ...g, [ratingField]: value } : g));
    }
  };

  const handleRemoveGoal = async (goalId) => {
    const { error } = await supabase
      .from('performance_goals')
      .update({ status: 'deleted' })
      .eq('id', goalId);

    if (!error) {
      setGoals(goals.filter(g => g.id !== goalId));
    }
  };

  const handleSubmitSelfReview = async () => {
    const { error } = await supabase
      .from('performance_reviews')
      .update({
        self_score: selfScore,
        comments: comments,
        status: 'Pending Manager Review'
      })
      .eq('id', review.id);

    if (!error) {
      alert('Self-review submitted successfully!');
      onBack();
    } else {
      alert('Failed to submit self-review');
    }
  };

  const handleSubmitManagerReview = async () => {
    const { error } = await supabase
      .from('performance_reviews')
      .update({
        manager_score: managerScore,
        comments: comments,
        status: 'Completed'
      })
      .eq('id', review.id);

    if (!error) {
      alert('Manager review finalized!');
      onBack();
    } else {
      alert('Failed to finalize review');
    }
  };

  if (loading) return <div>Loading review details...</div>;

  return (
    <div className="space-y-lg max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button 
          onClick={onBack}
          className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container-high transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-sm">
            <h2 className="font-title-lg text-title-lg text-on-surface">Review Details</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isCompleted ? 'bg-green-100 text-green-800' :
              review.status === 'Pending Manager Review' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {review.status}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant">
            {review.review_cycles?.name} • Ends {new Date(review.review_cycles?.end_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Goals Section */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md space-y-md">
        <div className="flex justify-between items-center">
          <h3 className="font-title-md text-on-surface">Performance Goals</h3>
          {!isCompleted && (canEditSelf || canEditManager) && (
            <button 
              onClick={() => setShowAddGoal(!showAddGoal)}
              className="text-primary hover:bg-primary-container hover:text-on-primary-container px-sm py-xs rounded-md transition-colors text-label-sm font-medium"
            >
              {showAddGoal ? 'Cancel' : '+ Add Goal'}
            </button>
          )}
        </div>

        {showAddGoal && (
          <form onSubmit={handleAddGoal} className="bg-surface-container p-md rounded-lg space-y-sm border border-outline-variant">
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Goal Title</label>
              <input 
                required
                type="text" 
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Description (Optional)</label>
              <textarea 
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                rows="2"
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
              ></textarea>
            </div>
            <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-md font-label-md hover:bg-primary/90">
              Save Goal
            </button>
          </form>
        )}

        {goals.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant italic">No goals added yet.</p>
        ) : (
          <div className="space-y-sm">
            {goals.map(goal => (
              <div key={goal.id} className="bg-surface p-md rounded-lg border border-outline-variant">
                <div className="flex justify-between items-start mb-sm">
                  <div>
                    <h4 className="font-title-sm font-bold text-on-surface">{goal.title}</h4>
                    {goal.description && <p className="text-body-sm text-on-surface-variant mt-xs">{goal.description}</p>}
                  </div>
                  {!isCompleted && (canEditSelf || canEditManager) && (
                    <button 
                      onClick={() => handleRemoveGoal(goal.id)}
                      className="text-error hover:bg-error-container hover:text-on-error-container p-1 rounded-md transition-colors"
                      title="Remove Goal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Ratings */}
                <div className="grid grid-cols-2 gap-md mt-md pt-md border-t border-outline-variant">
                  <div>
                    <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Employee Rating (1-5)</label>
                    <select 
                      className="bg-surface border border-outline rounded-md px-sm py-xs text-on-surface text-body-sm"
                      value={goal.employee_rating || ''}
                      onChange={(e) => handleUpdateGoalRating(goal.id, 'employee_rating', e.target.value)}
                      disabled={!canEditSelf}
                    >
                      <option value="">Not rated</option>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Manager Rating (1-5)</label>
                    <select 
                      className="bg-surface border border-outline rounded-md px-sm py-xs text-on-surface text-body-sm"
                      value={goal.manager_rating || ''}
                      onChange={(e) => handleUpdateGoalRating(goal.id, 'manager_rating', e.target.value)}
                      disabled={!canEditManager}
                    >
                      <option value="">Not rated</option>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall Review Section */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md space-y-md">
        <h3 className="font-title-md text-on-surface">Overall Evaluation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Self Score (Overall 1-5)</label>
            <input 
              type="number" 
              min="1" max="5" step="0.5"
              className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface disabled:opacity-50"
              value={selfScore}
              onChange={(e) => setSelfScore(e.target.value)}
              disabled={!canEditSelf}
              placeholder="e.g. 4.5"
            />
          </div>
          <div>
            <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Manager Score (Overall 1-5)</label>
            <input 
              type="number" 
              min="1" max="5" step="0.5"
              className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface disabled:opacity-50"
              value={managerScore}
              onChange={(e) => setManagerScore(e.target.value)}
              disabled={!canEditManager}
              placeholder="e.g. 4.0"
            />
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Comments / Feedback</label>
          <textarea 
            className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface disabled:opacity-50"
            rows="4"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={(!canEditSelf && !canEditManager)}
            placeholder="Add overall comments and feedback here..."
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-md border-t border-outline-variant">
          {canEditSelf && (
            <button 
              onClick={handleSubmitSelfReview}
              className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors"
            >
              Submit Self-Review
            </button>
          )}
          {canEditManager && (
            <button 
              onClick={handleSubmitManagerReview}
              className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors"
            >
              Finalize Manager Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
