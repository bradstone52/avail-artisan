import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function JoinTeam() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [success, setSuccess] = useState<{ orgName?: string; role?: string } | null>(null);

  // Redeem invite function - standalone, doesn't need org context
  const redeemInvite = async (code: string) => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('redeem-invite', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { inviteCode: code.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to redeem invite';
      return { success: false, error: message };
    }
  };

  // Auto-fill code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    if (!user) {
      // Save code and redirect to auth
      sessionStorage.setItem('pendingInviteCode', inviteCode.trim());
      navigate('/auth');
      return;
    }

    setIsJoining(true);

    try {
      const result = await redeemInvite(inviteCode);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to join');
        return;
      }

      setSuccess({
        orgName: result.data?.org?.name,
        role: result.data?.role,
      });
      
      toast.success(result.data?.message || 'Successfully joined!');
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/listings');
      }, 2000);
    } catch (err) {
      console.error('Join error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  // Check for pending invite code after login
  useEffect(() => {
    if (user) {
      const pendingCode = sessionStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        sessionStorage.removeItem('pendingInviteCode');
        setInviteCode(pendingCode.toUpperCase());
      }
    }
  }, [user]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-2" />
            <CardTitle>Welcome to {success.orgName || 'the team'}!</CardTitle>
            <CardDescription>
              You've joined as a {success.role || 'member'}. Redirecting...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Join a Team</CardTitle>
            <CardDescription>Please sign in to join an organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteCode && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Invite code</p>
                <code className="font-mono text-lg">{inviteCode}</code>
              </div>
            )}
            <Button onClick={() => {
              if (inviteCode) {
                sessionStorage.setItem('pendingInviteCode', inviteCode.trim());
              }
              navigate('/auth');
            }} className="w-full">
              Sign In to Continue
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
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={12}
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
