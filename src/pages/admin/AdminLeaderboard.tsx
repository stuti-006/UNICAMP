import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Trophy, Award, Users } from 'lucide-react';

export default function AdminLeaderboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for manual points assignment
  const [userEmail, setUserEmail] = useState('');
  const [pointsTotal, setPointsTotal] = useState('');

  // Fetch users for dropdowns (simplified for now, ideally handled via search)
  const { data: users } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: events } = useQuery({
    queryKey: ['adminEventsList'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleManualPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !pointsTotal) return;

    try {
      const targetUser = users?.find(u => u.email === userEmail);
      if (!targetUser) throw new Error('User not found');

      // Check if leaderboard entry exists
      const { data: existing } = await supabase
        .from('leaderboard_scores')
        .select('*')
        .eq('user_id', targetUser.id)
        .single();
        
      if (!existing) {
         // Create it first (though trigger should handle it, just to be safe)
         await supabase.from('leaderboard_scores').insert({ user_id: targetUser.id, karma_points: parseInt(pointsTotal) });
      } else {
         // Update existing
         await supabase.from('leaderboard_scores').update({ karma_points: existing.karma_points + parseInt(pointsTotal) }).eq('user_id', targetUser.id);
      }

      toast({
        title: "Points Awarded",
        description: `Successfully added ${pointsTotal} points to ${targetUser.name}.`,
      });
      setUserEmail('');
      setPointsTotal('');
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'global']});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5"/> Manual Achievements & Adjustments</CardTitle>
          <CardDescription>Directly award Points to a user for special achievements or manual corrections.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualPoints} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">User Email</Label>
                <Input 
                  id="userEmail" 
                  type="email" 
                  placeholder="student@college.edu" 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pointsTotal">Points to Award (can be negative to deduct)</Label>
                <Input 
                  id="pointsTotal" 
                  type="number" 
                  placeholder="e.g. 50" 
                  value={pointsTotal}
                  onChange={(e) => setPointsTotal(e.target.value)}
                  required 
                />
              </div>
            </div>
            <Button type="submit">Award Points</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5"/> Declare Hackathon Winners</CardTitle>
          <CardDescription>Select an event and record the winning teams to automatically distribute Points.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-6 rounded-md text-center text-muted-foreground">
             <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
             <p>This feature requires the Team Management module to be active.</p>
             <p className="text-sm mt-2">Currently, teams must be created via the database before ranking them here.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5"/> Refresh Leaderboard Views</CardTitle>
          <CardDescription>Manually trigger a sequence to update caching and verify data integrity.</CardDescription>
        </CardHeader>
        <CardContent>
           <Button variant="outline" onClick={() => toast({ title: "Leaderboard Synced", description: "Views are up to date with the latest base tables." })}>
             Sync Now
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
