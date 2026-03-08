-- Enable real-time for leaderboard_scores and hackathon_results
begin;
  -- Remove the supabase_realtime publication if the tables are already in it to avoid errors
  -- Then add them back.
  -- Alternatively, just try to add them if they don't exist in the publication
  
  -- Add leaderboard_scores to publication if it exists
  create publication supabase_realtime for table public.leaderboard_scores, public.hackathon_results;
exception
  when duplicate_object then
    -- Publication exists, so alter it and add the tables
    alter publication supabase_realtime add table public.leaderboard_scores, public.hackathon_results;
end;
