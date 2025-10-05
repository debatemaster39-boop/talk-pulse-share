import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AgeGateProps {
  onConfirm: () => void;
}

export const AgeGate = ({ onConfirm }: AgeGateProps) => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to DebateHub</CardTitle>
          <CardDescription className="text-base">
            Anonymous, time-bound debates on today's topics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Before you begin, please confirm that you meet our age requirement and agree to our terms of service.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
            <Checkbox
              id="age-confirm"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="age-confirm"
                className="text-base font-medium leading-none cursor-pointer"
              >
                I am 18 years or older
              </Label>
              <p className="text-sm text-muted-foreground">
                I understand this platform is for adult discussions and agree to the{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>

          <Button
            onClick={onConfirm}
            disabled={!checked}
            className="w-full"
            size="lg"
          >
            Enter DebateHub
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your session is ephemeral. No account required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
