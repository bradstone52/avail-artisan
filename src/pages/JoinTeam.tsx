import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, ArrowRight, Loader2 } from 'lucide-react';

export default function JoinTeam() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    if (!session?.access_token) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }

    setIsJoining(true);

    try {
      const { data, error } = await supabase.functions.invoke('join-org', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { inviteCode: inviteCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Joined ${data.org?.name || 'organization'} successfully!`);
      navigate('/listings');
    } catch (err) {
      console.error('Join error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Join a Team</CardTitle>
            <CardDescription>Please sign in to join an organization</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>Join a Team</CardTitle>
          <CardDescription>
            Enter the invite code provided by your team admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter invite code (e.g., ABC12345)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={8}
                disabled={isJoining}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
