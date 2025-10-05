import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";

const Admin = () => {
  const [topic, setTopic] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      
      setIsAdmin(!!roles);
      
      if (roles) {
        // Load current topic
        const { data: topicData } = await supabase
          .from("topics")
          .select("topic_text")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (topicData) setTopic(topicData.topic_text);
      }
    }
    setLoading(false);
  };

  const handleSaveTopic = async () => {
    if (!topic.trim()) {
      toast.error("Topic cannot be empty");
      return;
    }

    // Deactivate old topics
    await supabase
      .from("topics")
      .update({ active: false })
      .eq("active", true);

    // Insert new topic
    const { error } = await supabase
      .from("topics")
      .insert({
        topic_text: topic.trim(),
        active: true,
        created_by: user.id,
      });

    if (error) {
      toast.error("Failed to update topic");
    } else {
      toast.success("Topic updated successfully");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Auth onSuccess={checkAuth} />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage daily topics and monitor activity</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Topic</CardTitle>
            <CardDescription>
              Set the topic that all users will debate today. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Today's Debate Topic</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a thought-provoking question..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Keep it concise and engaging. Aim for open-ended questions.
              </p>
            </div>
            <Button onClick={handleSaveTopic} className="gap-2">
              <Save className="h-4 w-4" />
              Publish Topic
            </Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">247</CardTitle>
              <CardDescription>Active Users</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">12</CardTitle>
              <CardDescription>In Queue</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">3</CardTitle>
              <CardDescription>Active Debates</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Moderation queue - 0 pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No reports to review
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
