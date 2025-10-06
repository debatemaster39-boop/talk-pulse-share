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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomId = localStorage.getItem("current-room-id") || "";
  const username = localStorage.getItem("debate-username") || "Anonymous";

  // Initialize WebRTC
  useEffect(() => {
    let mounted = true;
    let pc: RTCPeerConnection | null = null;
    
    const initWebRTC = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
        setPeerConnection(pc);

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          pc!.addTrack(track, stream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          console.log("Received remote track:", event.streams[0]);
          const remoteStream = event.streams[0];
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate");
            await supabase.from("debate_sessions").update({
              room_id: `${roomId}_ice_${username}_${Date.now()}`,
            }).eq("id", sessionId);
            
            // Send ICE candidate via messages
            await supabase.from("messages").insert({
              session_id: sessionId,
              sender_id: username,
              message_text: JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate
              })
            });
          }
        };

        // Subscribe to signaling messages
        const signalingChannel = supabase
          .channel(`signaling:${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `session_id=eq.${sessionId}`,
            },
            async (payload: any) => {
              const msg = payload.new.message_text;
              try {
                const data = JSON.parse(msg);
                
                if (data.type === 'offer' && payload.new.sender_id !== username) {
                  console.log("Received offer");
                  await pc!.setRemoteDescription(new RTCSessionDescription(data.offer));
                  const answer = await pc!.createAnswer();
                  await pc!.setLocalDescription(answer);
                  
                  await supabase.from("messages").insert({
                    session_id: sessionId,
                    sender_id: username,
                    message_text: JSON.stringify({
                      type: 'answer',
                      answer: answer
                    })
                  });
                } else if (data.type === 'answer' && payload.new.sender_id !== username) {
                  console.log("Received answer");
                  await pc!.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'ice-candidate' && payload.new.sender_id !== username) {
                  console.log("Received ICE candidate");
                  await pc!.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
              } catch (e) {
                // Not a signaling message, ignore
              }
            }
          )
          .subscribe();

        // Check session to determine if we should create offer
        const { data: session } = await supabase
          .from("debate_sessions")
          .select("user_a")
          .eq("id", sessionId)
          .single();

        // First user (user_a) creates the offer
        if (session && session.user_a === username) {
          console.log("Creating offer as user_a");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          await supabase.from("messages").insert({
            session_id: sessionId,
            sender_id: username,
            message_text: JSON.stringify({
              type: 'offer',
              offer: offer
            })
          });
        }

        return () => {
          mounted = false;
          supabase.removeChannel(signalingChannel);
        };
        
      } catch (error) {
        console.error("Error setting up WebRTC:", error);
        if (mounted) {
          toast.error("Could not establish video connection");
        }
      }
    };
    
    initWebRTC();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pc) {
        pc.close();
      }
    };
  }, [sessionId, roomId]);

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

  // Subscribe to chat messages only
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (data) {
        // Filter out signaling messages
        const chatMessages = data.filter(msg => {
          try {
            const parsed = JSON.parse(msg.message_text);
            return !parsed.type || !['offer', 'answer', 'ice-candidate'].includes(parsed.type);
          } catch {
            return true; // Regular text message
          }
        });
        setMessages(chatMessages);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // Filter out signaling messages from chat
          try {
            const parsed = JSON.parse(msg.message_text);
            if (parsed.type && ['offer', 'answer', 'ice-candidate'].includes(parsed.type)) {
              return;
            }
          } catch {
            // Regular message
          }
          setMessages((prev) => [...prev, msg]);
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

    const username = localStorage.getItem("debate-username") || "Anonymous";

    const { error } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_id: username,
        message_text: inputValue.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setInputValue("");
    }
  };

  const handleEndDebate = async () => {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    
    const { error } = await supabase
      .from("debate_sessions")
      .update({ 
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: duration - timeLeft
      })
      .eq("id", sessionId);

    if (!error) {
      toast.success("Debate ended");
    }
    
    localStorage.removeItem("current-room-id");
    onEnd();
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    const username = localStorage.getItem("debate-username") || "Anonymous";

    await supabase.from("reports").insert({
      session_id: sessionId,
      reporter_id: username,
      reported_user_id: "opponent",
      reason: reportReason.trim(),
    });

    await supabase
      .from("debate_sessions")
      .update({ status: "reported" })
      .eq("id", sessionId);

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
            <span className="ml-2">End</span>
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
