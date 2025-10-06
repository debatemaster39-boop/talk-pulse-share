import { useEffect, useState, useRef } from "react";
import { Loader2, Users, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaitingRoomProps {
  topic: string;
  queuePosition: number;
  onMatched: (sessionId: string, roomId: string) => void;
}

export const WaitingRoom = ({ topic, queuePosition, onMatched }: WaitingRoomProps) => {
  const [searching, setSearching] = useState(false);
  const [position, setPosition] = useState(queuePosition);
  const queueIdRef = useRef<string | null>(null);

  useEffect(() => {
    const joinQueue = async () => {
      setSearching(true);
      const username = localStorage.getItem("debate-username") || "Anonymous";

      try {
        // Get active topic
        const { data: topicData } = await supabase
          .from("topics")
          .select("id")
          .eq("active", true)
          .limit(1)
          .maybeSingle();

        // Join the queue
        const { data: queueEntry, error: queueError } = await supabase
          .from("queue")
          .insert({
            username,
            topic_id: topicData?.id,
            status: "waiting",
          })
          .select()
          .single();

        if (queueError) {
          toast.error("Failed to join queue");
          console.error("Queue error:", queueError);
          return;
        }

        queueIdRef.current = queueEntry.id;

        // Check for existing waiting users
        const { data: waitingUsers } = await supabase
          .from("queue")
          .select("*")
          .eq("status", "waiting")
          .neq("id", queueEntry.id)
          .order("joined_at", { ascending: true })
          .limit(1);

        if (waitingUsers && waitingUsers.length > 0) {
          // Match with the first waiting user
          const opponent = waitingUsers[0];
          const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Create debate session
          const { data: session, error: sessionError } = await supabase
            .from("debate_sessions")
            .insert({
              room_id: roomId,
              topic_id: topicData?.id,
              user_a: opponent.username,
              user_b: username,
              status: "active",
            })
            .select()
            .single();

          if (sessionError) {
            toast.error("Failed to create session");
            console.error("Session error:", sessionError);
            return;
          }

          // Remove both users from queue
          await supabase.from("queue").delete().in("id", [opponent.id, queueEntry.id]);

          // Notify matched
          onMatched(session.id, roomId);
        } else {
          // Subscribe to queue changes to detect when someone joins
          const channel = supabase
            .channel("queue_changes")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "queue",
              },
              async (payload) => {
                console.log("New user joined queue:", payload);

                // Check if we're still in queue
                const { data: myStatus } = await supabase
                  .from("queue")
                  .select("status")
                  .eq("id", queueIdRef.current)
                  .single();

                if (!myStatus || myStatus.status !== "waiting") return;

                // Match with the new user
                const newUser = payload.new;
                if (newUser.id === queueIdRef.current) return;

                const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create debate session
                const { data: session, error: sessionError } = await supabase
                  .from("debate_sessions")
                  .insert({
                    room_id: roomId,
                    topic_id: topicData?.id,
                    user_a: username,
                    user_b: newUser.username,
                    status: "active",
                  })
                  .select()
                  .single();

                if (sessionError) {
                  console.error("Session error:", sessionError);
                  return;
                }

                // Remove both users from queue
                await supabase.from("queue").delete().in("id", [queueIdRef.current, newUser.id]);

                channel.unsubscribe();
                onMatched(session.id, roomId);
              }
            )
            .subscribe();

          // Update position periodically
          const positionInterval = setInterval(async () => {
            const { count } = await supabase
              .from("queue")
              .select("*", { count: "exact", head: true })
              .eq("status", "waiting")
              .lt("joined_at", queueEntry.joined_at);

            setPosition((count || 0) + 1);
          }, 2000);

          return () => {
            channel.unsubscribe();
            clearInterval(positionInterval);
          };
        }
      } catch (error) {
        console.error("Error joining queue:", error);
        toast.error("Failed to join queue");
      }
    };

    joinQueue();

    return () => {
      // Clean up queue entry on unmount
      if (queueIdRef.current) {
        supabase.from("queue").delete().eq("id", queueIdRef.current);
      }
    };
  }, [onMatched, topic]);

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
              <div className="text-2xl font-bold text-foreground">{position}</div>
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
