import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UsernameEntryProps {
  onSubmit: (username: string) => void;
}

export const UsernameEntry = ({ onSubmit }: UsernameEntryProps) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to deb8te</CardTitle>
          <CardDescription>
            Pick a username to start debating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            <Button type="submit" className="w-full">
              Start Debating
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
