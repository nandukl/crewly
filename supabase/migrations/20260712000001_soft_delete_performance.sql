-- Update check constraint for performance_reviews to allow 'Cancelled'
ALTER TABLE public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_status_check;
ALTER TABLE public.performance_reviews ADD CONSTRAINT performance_reviews_status_check CHECK (status IN ('Pending Self-Review', 'Pending Manager Review', 'Completed', 'Cancelled'));

-- Add status column to performance_goals for soft deletes
ALTER TABLE public.performance_goals ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted'));
