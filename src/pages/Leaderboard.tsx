import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, User, Target, Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the type for leaderboard entries (based on the view and table structure)
interface GlobalLeaderboardEntry {
  user_id: string;
  name: string;
  department: string | null;
  semester: number | null;
  karma_points: number;
  hackathon_participations: number;
  hackathon_wins: number;
  event_participations: number;
  rank: number;
}

const fetchGlobalLeaderboard = async () => {
  const { data, error } = await supabase
    .from("global_leaderboard")
    .select("*")
    .order("rank", { ascending: true });

  if (error) throw error;
  return data as GlobalLeaderboardEntry[];
};

export default function Leaderboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to changes on the leaderboard_scores table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_scores',
        },
        () => {
          // When a change happens, proactively refetch the leaderboard
          queryClient.refetchQueries({ queryKey: ["leaderboard", "global"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: globalData = [], isLoading } = useQuery({
    queryKey: ["leaderboard", "global"],
    queryFn: fetchGlobalLeaderboard,
  });

  const [activeTab, setActiveTab] = useState("global");

  // Filter logic for other tabs (simulated on client for now)
  const departmentData = globalData.filter((u) => u.department);
  const semesterData = globalData.filter((u) => u.semester);
  
  // Real team queries could be implemented here; for now, we'll keep the Teams tab empty or basic.

  const renderPodium = (data: GlobalLeaderboardEntry[]) => {
    if (data.length < 3) return null;
    
    // Rearrange top 3: [2nd, 1st, 3rd] for classic podium display
    const podium = [data[1], data[0], data[2]];
    
    return (
      <div className="flex justify-center items-end gap-2 md:gap-6 mb-12 mt-8">
        {podium.map((user, idx) => {
          if (!user) return null;
          // Map idx 0 -> 2nd place, 1 -> 1st place, 2 -> 3rd place
          const rankPos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
          const heightClass = rankPos === 1 ? "h-48" : rankPos === 2 ? "h-40" : "h-32";
          const colorClass = 
            rankPos === 1 ? "bg-amber-400/20 border-amber-400" :
            rankPos === 2 ? "bg-neutral-300/20 border-neutral-300" :
            "bg-amber-700/20 border-amber-700";
            
          const iconColor = 
            rankPos === 1 ? "text-amber-400" :
            rankPos === 2 ? "text-neutral-400" :
            "text-amber-700";

          return (
            <div key={`podium-${user.user_id}`} className="flex flex-col items-center">
              <div className="relative mb-2">
                {rankPos === 1 && (
                  <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400" />
                )}
                <Avatar className={`w-16 h-16 md:w-20 md:h-20 border-4 ${rankPos === 1 ? 'border-amber-400' : rankPos === 2 ? 'border-neutral-300' : 'border-amber-700'}`}>
                  <AvatarFallback>{user.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-background ${colorClass}`}>
                  {rankPos}
                </div>
              </div>
              <div className="text-center mb-2 mt-4">
                <p className="font-bold text-sm md:text-base truncate w-20 md:w-28">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.karma_points} Points</p>
              </div>
              <div className={`w-20 md:w-28 ${heightClass} ${colorClass} border-t-2 border-l border-r rounded-t-lg flex justify-center pt-4`}>
                <Trophy className={`w-8 h-8 ${iconColor} opacity-50`} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRankList = (data: GlobalLeaderboardEntry[]) => {
    // Only show people after top 3
    const listData = data.slice(3);
    
    return (
      <div className="space-y-4">
        {listData.map((user, idx) => (
          <Card key={`list-${user.user_id}`} className="overflow-hidden hover:bg-accent/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-8 text-center font-bold text-muted-foreground text-lg">
                #{user.rank}
              </div>
              <Avatar className="w-10 h-10 border">
                <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm md:text-base">{user.name}</p>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  {user.department && <span>{user.department}</span>}
                  {user.semester && <span>• Year {user.semester}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="font-bold">
                  {user.karma_points} Points
                </Badge>
                <div className="flex gap-2 text-xs text-muted-foreground hidden md:flex">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3"/> {user.event_participations} Events</span>
                  <span className="flex items-center gap-1"><Award className="w-3 h-3"/> {user.hackathon_wins} Wins</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <main className="container max-w-5xl mx-auto px-4 pt-12 pb-12">
        <div className="mb-8 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Unicamp <span className="text-primary">Leaderboard</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compete in hackathons, attend events, and build your achievements to rise to the top of the campus!
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center">
              <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
              <p>Loading the champions...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="global" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="department">Branch</TabsTrigger>
                <TabsTrigger value="semester">Year</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="global" className="space-y-8 animate-in fade-in-50 duration-500">
              {globalData.length > 0 ? (
                <>
                  {renderPodium(globalData)}
                  <ScrollArea className="h-[500px] rounded-md custom-scrollbar">
                    {renderRankList(globalData)}
                  </ScrollArea>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No points awarded yet. Be the first!
                </div>
              )}
            </TabsContent>

            <TabsContent value="department" className="space-y-8">
               {/* Extremely simplified department filter visualization */}
               {departmentData.length > 0 ? (
                 <>
                   {renderPodium(departmentData)}
                   <ScrollArea className="h-[500px] rounded-md custom-scrollbar">
                     {renderRankList(departmentData)}
                   </ScrollArea>
                 </>
               ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Update your profiles with your branch to compete.
                </div>
               )}
            </TabsContent>

            <TabsContent value="semester" className="space-y-8">
               {semesterData.length > 0 ? (
                 <>
                   {renderPodium(semesterData)}
                   <ScrollArea className="h-[500px] rounded-md custom-scrollbar">
                     {renderRankList(semesterData)}
                   </ScrollArea>
                 </>
               ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Update your profiles with your year to compete.
                </div>
               )}
            </TabsContent>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" /> Team Leaderboards Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Team rankings are currently being calculated across ongoing hackathons.</p>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        )}
      </main>
    </div>
  );
}
