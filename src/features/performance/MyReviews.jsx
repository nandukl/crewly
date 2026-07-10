import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { ReviewDetails } from './ReviewDetails';

export const MyReviews = () => {
  const { currentMembership } = useOrg();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    const fetchMyReviews = async () => {
      if (!currentMembership) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          review_cycles ( name, start_date, end_date )
        `)
        .eq('reviewee_id', currentMembership.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setReviews(data);
      }
      setLoading(false);
    };

    fetchMyReviews();
  }, [currentMembership]);

  if (loading) return <div>Loading your reviews...</div>;

  if (selectedReview) {
    return <ReviewDetails review={selectedReview} onBack={() => setSelectedReview(null)} isManager={false} />;
  }

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="font-title-lg text-title-lg text-on-surface">My Reviews</h2>
        <p className="text-body-md text-on-surface-variant">View and complete your self-evaluations.</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant border-dashed">
          You have no performance reviews assigned.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md">
          {reviews.map(review => (
            <div key={review.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant flex flex-col md:flex-row justify-between items-center gap-md">
              <div className="flex-1">
                <div className="flex items-center gap-sm mb-xs">
                  <h4 className="font-title-md font-bold text-on-surface">{review.review_cycles?.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    review.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {review.status}
                  </span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Cycle ends: {new Date(review.review_cycles?.end_date).toLocaleDateString()}
                </p>
                {review.status === 'Completed' && (
                  <div className="mt-sm text-sm text-on-surface">
                    <span className="font-semibold">Final Rating:</span> {review.manager_score || 'N/A'} / 5
                  </div>
                )}
              </div>
              <div>
                <button 
                  onClick={() => setSelectedReview(review)}
                  className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  {review.status === 'Pending Self-Review' ? 'Start Self-Review' : 'View Details'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
