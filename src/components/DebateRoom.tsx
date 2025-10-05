import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Flag, X, Send } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: Date;
}

interface DebateRoomProps {
  topic: string;
  duration: number; // seconds
  onEnd: () => void;
  onReport: (reason: string) => void;
}

export const DebateRoom = ({ topic, duration, onEnd, onReport }: DebateRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onEnd]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "me",
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");

    // Simulate opponent response (for demo)
    setTimeout(() => {
      const responses = [
        "That's an interesting point, but have you considered...",
        "I respectfully disagree because...",
        "Can you elaborate on that?",
        "That's a valid perspective. However...",
      ];
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: "them",
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    }, 2000);
  };

  const handleReport = () => {
    onReport("inappropriate_behavior");
    toast.error("Debate ended. Report submitted to moderators.");
    setShowReportDialog(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft < 60) return "bg-timer-critical";
    if (timeLeft < 180) return "bg-timer-warning";
    return "bg-timer-bg";
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium text-muted-foreground mb-1">Today's Topic</h2>
              <p className="text-base font-semibold text-foreground truncate">{topic}</p>
            </div>
            <div className={`px-6 py-2 rounded-full text-white font-bold text-xl ${getTimerColor()} transition-colors`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-4 max-w-4xl">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">The debate will begin when you send the first message.</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  message.sender === "me"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-card shadow-lg">
        <div className="container mx-auto px-4 py-4 space-y-3 max-w-4xl">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReportDialog(true)}
              className="gap-2"
            >
              <Flag className="h-4 w-4" />
              Report
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndDialog(true)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              End Debate
            </Button>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Keep it respectful. Violations will result in immediate termination.
          </p>
        </div>
      </div>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Inappropriate Behavior</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end the debate and notify moderators. Your report will be reviewed within 24 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport} className="bg-destructive text-destructive-foreground">
              Report & End
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Debate Early?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this debate? You'll return to the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Debate</AlertDialogCancel>
            <AlertDialogAction onClick={onEnd}>End Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
