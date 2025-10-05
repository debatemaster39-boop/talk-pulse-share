import { useState } from "react";
import { AgeGate } from "@/components/AgeGate";
import { WaitingRoom } from "@/components/WaitingRoom";
import { DebateRoom } from "@/components/DebateRoom";

type AppState = "age-gate" | "waiting" | "debate" | "ended";

const Index = () => {
  const [state, setState] = useState<AppState>("age-gate");
  const [skipCount, setSkipCount] = useState(0);

  const handleAgeConfirm = () => {
    setState("waiting");
  };

  const handleSkip = () => {
    setSkipCount((prev) => prev + 1);
    // In production, implement rate limiting and cooldowns
  };

  const handleEndDebate = () => {
    setState("waiting");
  };

  const handleReport = (reason: string) => {
    console.log("Report submitted:", reason);
    setState("waiting");
  };

  if (state === "age-gate") {
    return <AgeGate onConfirm={handleAgeConfirm} />;
  }

  if (state === "waiting") {
    // Simulate matching after 3 seconds
    setTimeout(() => {
      if (state === "waiting") {
        setState("debate");
      }
    }, 3000);

    return (
      <WaitingRoom
        topic="Should we adopt universal basic income?"
        queuePosition={Math.floor(Math.random() * 10) + 1}
        onSkip={handleSkip}
        canSkip={skipCount < 3}
        skipCooldown={skipCount >= 3 ? 10 : undefined}
      />
    );
  }

  if (state === "debate") {
    return (
      <DebateRoom
        topic="Should we adopt universal basic income?"
        duration={600} // 10 minutes
        onEnd={handleEndDebate}
        onReport={handleReport}
      />
    );
  }

  return null;
};

export default Index;
