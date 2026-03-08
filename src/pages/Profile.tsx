import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Award, Target, Hash } from 'lucide-react';

const Profile = () => {
  const { profile } = useAuth();
  
  const { data: karmaStats } = useQuery({
    queryKey: ['userKarmaStats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('global_leaderboard')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="shadow-medium">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-primary">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                {profile?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.name}</CardTitle>
              <p className="text-muted-foreground">{profile?.email}</p>
              <Badge variant="outline" className="mt-2">{profile?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.college && <div><span className="font-semibold">College:</span> {profile.college}</div>}
          {profile?.branch && <div><span className="font-semibold">Branch:</span> {profile.branch}</div>}
          {profile?.year && <div><span className="font-semibold">Year:</span> {profile.year}</div>}
        </CardContent>
      </Card>

      {/* Karma Score & Leaderboard Stats */}
      {karmaStats && (
        <Card className="shadow-medium border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Karma Score & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Hash className="w-6 h-6 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{karmaStats.rank || '-'}</div>
                <div className="text-xs text-muted-foreground">Global Rank</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Trophy className="w-6 h-6 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{karmaStats.karma_points || 0}</div>
                <div className="text-xs text-amber-600/80 dark:text-amber-400/80">Total Karma</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Target className="w-6 h-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{karmaStats.event_participations || 0}</div>
                <div className="text-xs text-muted-foreground">Events Attended</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Award className="w-6 h-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{karmaStats.hackathon_wins || 0}</div>
                <div className="text-xs text-muted-foreground">Hackathon Wins</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;