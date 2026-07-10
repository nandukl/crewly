import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { ReviewDetails } from './ReviewDetails';

export const TeamReviews = () => {
  const { currentMembership } = useOrg();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    const fetchTeamReviews = async () => {
      if (!currentMembership) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          review_cycles ( name, end_date ),
          memberships!performance_reviews_reviewee_id_fkey ( user_profiles ( first_name, last_name, avatar_url ) )
        `)
        .eq('reviewer_id', currentMembership.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setReviews(data);
      }
      setLoading(false);
    };

    fetchTeamReviews();
  }, [currentMembership]);

  if (loading) return <div>Loading team reviews...</div>;

  if (selectedReview) {
    return <ReviewDetails review={selectedReview} onBack={() => setSelectedReview(null)} isManager={true} />;
  }

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="font-title-lg text-title-lg text-on-surface">Team Reviews</h2>
        <p className="text-body-md text-on-surface-variant">Evaluate your direct reports' performance.</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant border-dashed">
          No team reviews pending for you.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md">
          {reviews.map(review => {
            const reviewee = review.memberships?.user_profiles;
            const name = reviewee ? `${reviewee.first_name || ''} ${reviewee.last_name || ''}`.trim() : 'Unknown Employee';

            return (
              <div key={review.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant flex flex-col md:flex-row justify-between items-center gap-md">
                <div className="flex items-center gap-md flex-1">
                  <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold overflow-hidden">
                    {reviewee?.avatar_url ? (
                      <img src={reviewee.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-title-md font-bold text-on-surface">{name}</h4>
                    <p className="text-body-sm text-on-surface-variant">
                      {review.review_cycles?.name} • <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        review.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        review.status === 'Pending Manager Review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {review.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => setSelectedReview(review)}
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {review.status === 'Pending Manager Review' ? 'Provide Rating' : 'View Details'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
