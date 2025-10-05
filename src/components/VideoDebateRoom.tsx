import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Mic, MicOff, Video, VideoOff, MessageSquare, Flag, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

interface VideoDebateRoomProps {
  sessionId: string;
  topic: string;
  duration: number;
  onEnd: () => void;
  onReport: (reason: string) => void;
}

export const VideoDebateRoom = ({ sessionId, topic, duration, onEnd, onReport }: VideoDebateRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize media
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        toast.error("Could not access camera/microphone");
      }
    };
    initMedia();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndDebate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Subscribe to messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_id: user.id,
        message_text: inputValue.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setInputValue("");
    }
  };

  const handleEndDebate = async () => {
    const { error } = await supabase
      .from("debate_sessions")
      .update({ 
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: duration - timeLeft
      })
      .eq("id", sessionId);

    if (!error) {
      onEnd();
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session } = await supabase
      .from("debate_sessions")
      .select("user_a, user_b")
      .eq("id", sessionId)
      .single();

    if (session) {
      const reportedUserId = session.user_a === user.id ? session.user_b : session.user_a;
      
      await supabase.from("reports").insert({
        session_id: sessionId,
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason: reportReason.trim(),
      });

      await supabase
        .from("debate_sessions")
        .update({ status: "reported" })
        .eq("id", sessionId);
    }

    toast.success("Report submitted");
    setShowReportDialog(false);
    onReport(reportReason);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 60) return "text-destructive";
    if (timeLeft <= 180) return "text-warning";
    return "text-foreground";
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Debate Topic</h2>
            <p className="text-sm text-muted-foreground">{topic}</p>
          </div>
          <div className={`text-2xl font-bold ${getTimerColor()}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="grid flex-1 grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <Card className="relative overflow-hidden bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-sm text-white">
            You
          </div>
        </Card>

        {/* Remote Video */}
        <Card className="relative overflow-hidden bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-sm text-white">
            Opponent
          </div>
        </Card>
      </div>

      {/* Chat */}
      <div className="border-t bg-card p-4">
        <div className="container mx-auto">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">Chat</h3>
          </div>
          
          <ScrollArea className="mb-4 h-32 rounded border p-2">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-2 text-sm">
                <span className="font-semibold">User:</span> {msg.message_text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t bg-card p-4">
        <div className="container mx-auto flex justify-center gap-4">
          <Button
            variant={audioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant={videoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowReportDialog(true)}
          >
            <Flag className="h-5 w-5" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowEndDialog(true)}
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report User</AlertDialogTitle>
            <AlertDialogDescription>
              Please describe the issue. This will end the debate and notify moderators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason for reporting..."
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>Submit Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Debate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this debate early?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndDebate}>End Debate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
