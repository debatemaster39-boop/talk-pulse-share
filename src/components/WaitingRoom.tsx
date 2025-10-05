import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock } from "lucide-react";

interface WaitingRoomProps {
  topic: string;
  queuePosition: number;
  onSkip: () => void;
  canSkip: boolean;
  skipCooldown?: number;
}

export const WaitingRoom = ({ topic, queuePosition, onSkip, canSkip, skipCooldown }: WaitingRoomProps) => {
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

          <div className="pt-4 space-y-3">
            <Button
              onClick={onSkip}
              disabled={!canSkip}
              variant="outline"
              className="w-full"
            >
              {skipCooldown ? `Skip (${skipCooldown}s cooldown)` : "Skip & Re-queue"}
            </Button>
            {!canSkip && (
              <p className="text-xs text-center text-muted-foreground">
                You've used your skip limit. Please wait to be matched.
              </p>
            )}
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
