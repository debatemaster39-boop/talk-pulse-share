import { useState, useEffect } from "react";
import { UsernameEntry } from "@/components/UsernameEntry";
import { WaitingRoom } from "@/components/WaitingRoom";
import { VideoDebateRoom } from "@/components/VideoDebateRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "username" | "waiting" | "debate";

const Index = () => {
  const [state, setState] = useState<AppState>("username");
  const [username, setUsername] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [topic, setTopic] = useState("Should we adopt universal basic income?");

  useEffect(() => {
    const storedUsername = localStorage.getItem("debate-username");
    if (storedUsername) {
      setUsername(storedUsername);
      setState("waiting");
    }
  }, []);

  useEffect(() => {
    const fetchTopic = async () => {
      const { data } = await supabase
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

  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    localStorage.setItem("debate-username", name);
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

  if (state === "username") {
    return <UsernameEntry onSubmit={handleUsernameSubmit} />;
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
