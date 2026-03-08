-- Migration script to add Gamified Leaderboard & Karma Score System tables

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 3. Create hackathon_results table
CREATE TABLE IF NOT EXISTS public.hackathon_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create leaderboard_scores table
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    karma_points INTEGER NOT NULL DEFAULT 0,
    hackathon_participations INTEGER NOT NULL DEFAULT 0,
    hackathon_wins INTEGER NOT NULL DEFAULT 0,
    event_participations INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Teams Policies
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Team Members Policies
CREATE POLICY "Anyone can read team_members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage team_members" ON public.team_members FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Hackathon Results Policies
CREATE POLICY "Anyone can read hackathon_results" ON public.hackathon_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage hackathon_results" ON public.hackathon_results FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Leaderboard Scores Policies
CREATE POLICY "Anyone can read leaderboard_scores" ON public.leaderboard_scores FOR SELECT TO authenticated USING (true);
-- Users cannot update their own scores directly, only via triggers or admins
CREATE POLICY "Admins can manage leaderboard_scores" ON public.leaderboard_scores FOR ALL TO authenticated USING (is_admin(auth.uid()));


-- 7. Initialize leaderboard scores for new and existing users
CREATE OR REPLACE FUNCTION initialize_leaderboard_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.leaderboard_scores (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger to create leaderboard_scores entry when a new profile is created
DROP TRIGGER IF EXISTS on_profile_created_init_score ON public.profiles;
CREATE TRIGGER on_profile_created_init_score
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION initialize_leaderboard_score();

-- Initialize for existing profiles
INSERT INTO public.leaderboard_scores (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- 8. Functions and Triggers for automatic Karma Score Calculation

-- Trigger function for event attendance
CREATE OR REPLACE FUNCTION handle_attendance_karma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If attendance is approved, grant 5 event participation points
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE public.leaderboard_scores
        SET 
            karma_points = karma_points + 5,
            event_participations = event_participations + 1,
            last_updated = NOW()
        WHERE user_id = NEW.user_id;
    -- If attendance approval is revoked, deduct the points
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        UPDATE public.leaderboard_scores
        SET 
            karma_points = GREATEST(karma_points - 5, 0),
            event_participations = GREATEST(event_participations - 1, 0),
            last_updated = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_attendance_status_change ON public.attendances;
CREATE TRIGGER on_attendance_status_change
    AFTER UPDATE OF status ON public.attendances
    FOR EACH ROW EXECUTE FUNCTION handle_attendance_karma();


-- Trigger function for hackathon results
CREATE OR REPLACE FUNCTION handle_hackathon_result_karma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    points_to_award INTEGER := 0;
    is_win INTEGER := 0;
    member_record RECORD;
BEGIN
    -- Determine points based on position
    -- Participation (+10), 3rd (+30), 2nd (+50), 1st (+75)
    -- Total points awarded will be stored in points_awarded column to track
    IF NEW.position = 1 THEN
        points_to_award := 75;
        is_win := 1;
    ELSIF NEW.position = 2 THEN
        points_to_award := 50;
        is_win := 1;
    ELSIF NEW.position = 3 THEN
        points_to_award := 30;
        is_win := 1;
    ELSE
        -- Just participation
        points_to_award := 10;
        is_win := 0;
    END IF;

    NEW.points_awarded := points_to_award;

    -- Update leaderboard for all team members
    FOR member_record IN SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id
    LOOP
        UPDATE public.leaderboard_scores
        SET 
            karma_points = karma_points + points_to_award,
            hackathon_participations = hackathon_participations + 1,
            hackathon_wins = hackathon_wins + is_win,
            last_updated = NOW()
        WHERE user_id = member_record.user_id;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_hackathon_result_insert ON public.hackathon_results;
CREATE TRIGGER on_hackathon_result_insert
    BEFORE INSERT ON public.hackathon_results
    FOR EACH ROW EXECUTE FUNCTION handle_hackathon_result_karma();


-- Trigger function to handle hackathon result deletion (revert karma)
CREATE OR REPLACE FUNCTION handle_hackathon_result_revert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_win INTEGER := 0;
    member_record RECORD;
BEGIN
    IF OLD.position <= 3 THEN
        is_win := 1;
    END IF;

    -- Revert leaderboard for all team members
    FOR member_record IN SELECT user_id FROM public.team_members WHERE team_id = OLD.team_id
    LOOP
        UPDATE public.leaderboard_scores
        SET 
            karma_points = GREATEST(karma_points - OLD.points_awarded, 0),
            hackathon_participations = GREATEST(hackathon_participations - 1, 0),
            hackathon_wins = GREATEST(hackathon_wins - is_win, 0),
            last_updated = NOW()
        WHERE user_id = member_record.user_id;
    END LOOP;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_hackathon_result_delete ON public.hackathon_results;
CREATE TRIGGER on_hackathon_result_delete
    AFTER DELETE ON public.hackathon_results
    FOR EACH ROW EXECUTE FUNCTION handle_hackathon_result_revert();


-- Update triggers for updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 9. Views for the leaderboards
-- Global Leaderboard View
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
    l.user_id,
    p.name,
    p.branch AS department,
    p.year AS semester,
    l.karma_points,
    l.hackathon_participations,
    l.hackathon_wins,
    l.event_participations,
    RANK() OVER (ORDER BY l.karma_points DESC) as rank
FROM 
    public.leaderboard_scores l
JOIN 
    public.profiles p ON l.user_id = p.id;
    
-- Ensure the views can be accessed by authenticated users
GRANT SELECT ON public.global_leaderboard TO authenticated;
