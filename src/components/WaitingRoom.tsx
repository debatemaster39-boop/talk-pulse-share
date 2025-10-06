import { useEffect, useState } from "react";
import { Loader2, Users, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaitingRoomProps {
  topic: string;
  queuePosition: number;
  onMatched: (sessionId: string) => void;
}

export const WaitingRoom = ({ topic, queuePosition, onMatched }: WaitingRoomProps) => {
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const joinQueue = async () => {
      setSearching(true);
      const username = localStorage.getItem("debate-username") || "Anonymous";

      // Simulate matching after 3 seconds
      setTimeout(async () => {
        // Create a debate session
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { data: topicData } = await supabase
          .from("topics")
          .select("id")
          .eq("active", true)
          .limit(1)
          .maybeSingle();

        const { data: session, error } = await supabase
          .from("debate_sessions")
          .insert({
            room_id: roomId,
            topic_id: topicData?.id,
            user_a: username,
            user_b: "Opponent", // In production, match with real user
            status: "active",
          })
          .select()
          .single();

        if (error) {
          toast.error("Failed to create session");
          setSearching(false);
        } else if (session) {
          onMatched(session.id);
        }
      }, 3000);
    };

    joinQueue();
  }, [onMatched]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl">Finding Your Debate Partner</CardTitle>
          <CardDescription className="text-base">
            Matching you with someone for today's topic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">Today's Topic</div>
            <h3 className="text-xl font-semibold text-foreground">{topic}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{queuePosition}</div>
              <div className="text-xs text-muted-foreground">Position in Queue</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">~30s</div>
              <div className="text-xs text-muted-foreground">Estimated Wait</div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Debate duration: <span className="font-semibold text-foreground">10 minutes</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Be respectful. Report inappropriate behavior immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
