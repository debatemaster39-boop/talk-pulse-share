import { useState, useEffect } from "react";
import { AgeGate } from "@/components/AgeGate";
import { Auth } from "@/components/Auth";
import { WaitingRoom } from "@/components/WaitingRoom";
import { VideoDebateRoom } from "@/components/VideoDebateRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "age-gate" | "auth" | "waiting" | "debate";

const Index = () => {
  const [state, setState] = useState<AppState>("age-gate");
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [topic, setTopic] = useState("Should we adopt universal basic income?");

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        if (state === "auth") setState("waiting");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTopic = async () => {
      const { data } = await supabase
        .from("topics")
        .select("topic_text")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (data) setTopic(data.topic_text);
    };
    fetchTopic();
  }, []);

  const handleAgeConfirm = () => {
    if (user) {
      setState("waiting");
    } else {
      setState("auth");
    }
  };

  const handleAuthSuccess = () => {
    setState("waiting");
  };

  const handleMatched = (newSessionId: string) => {
    setSessionId(newSessionId);
    setState("debate");
  };

  const handleEndDebate = () => {
    setState("waiting");
  };

  const handleReport = (reason: string) => {
    console.log("Report submitted:", reason);
    toast.success("Report submitted to moderators");
    setState("waiting");
  };

  if (state === "age-gate") {
    return <AgeGate onConfirm={handleAgeConfirm} />;
  }

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
