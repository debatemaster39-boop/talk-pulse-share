import { useState, useEffect } from "react";
import { Auth } from "@/components/Auth";
import { WaitingRoom } from "@/components/WaitingRoom";
import { VideoDebateRoom } from "@/components/VideoDebateRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "auth" | "waiting" | "debate";

const Index = () => {
  const [state, setState] = useState<AppState>("auth");
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [topic, setTopic] = useState("Should we adopt universal basic income?");

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setState("waiting");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setState("waiting");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTopic = async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("topic_text")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) setTopic(data.topic_text);
    };
    fetchTopic();
  }, []);

  const handleAuthSuccess = () => {
    setState("waiting");
  };

  const handleMatched = (newSessionId: string) => {
    setSessionId(newSessionId);
    setState("debate");
  };

  const handleEndDebate = () => {
    setSessionId("");
    setState("waiting");
  };

  const handleReport = (reason: string) => {
    console.log("Report submitted:", reason);
    toast.success("Report submitted to moderators");
    setSessionId("");
    setState("waiting");
  };

  if (state === "auth") {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  if (state === "waiting") {
    return (
      <WaitingRoom
        topic={topic}
        queuePosition={Math.floor(Math.random() * 10) + 1}
        onMatched={handleMatched}
      />
    );
  }

  if (state === "debate" && sessionId) {
    return (
      <VideoDebateRoom
        sessionId={sessionId}
        topic={topic}
        duration={600}
        onEnd={handleEndDebate}
        onReport={handleReport}
      />
    );
  }

  return null;
};

export default Index;
