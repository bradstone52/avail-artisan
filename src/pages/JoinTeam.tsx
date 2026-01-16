import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, ArrowRight, Loader2, CheckCircle, ArrowLeft, Mail, Lock, User } from 'lucide-react';

type Step = 'code' | 'signup' | 'success';

export default function JoinTeam() {
  const { user, session, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<Step>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ orgName?: string; role?: string } | null>(null);

  // Signup form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hasAccount, setHasAccount] = useState(false);

  // Auto-fill code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // If user is already logged in, try to redeem directly
  const redeemAsExistingUser = async () => {
    if (!session?.access_token || !inviteCode) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-invite', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { inviteCode: inviteCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess({ orgName: data?.org?.name, role: data?.role });
      setStep('success');
      toast.success(data?.message || 'Successfully joined!');
      
      setTimeout(() => navigate('/listings'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle continuing to signup/login form
  const handleContinue = () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    
    if (user) {
      // Already logged in - redeem directly
      redeemAsExistingUser();
    } else {
      setStep('signup');
    }
  };

  // Handle signup with invite
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('signup-with-invite', {
        body: { 
          inviteCode: inviteCode.trim(),
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign in the user
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast.error('Account created but sign-in failed. Please sign in manually.');
        navigate('/auth');
        return;
      }

      setSuccess({ orgName: data?.org?.name, role: data?.role });
      setStep('success');
      toast.success(data?.message || 'Account created successfully!');
      
      setTimeout(() => navigate('/listings'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login then redeem
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;

      // After login, get new session and redeem
      const { data: { session: newSession } } = await supabase.auth.getSession();
      
      if (!newSession?.access_token) {
        throw new Error('Failed to get session');
      }

      const { data, error } = await supabase.functions.invoke('redeem-invite', {
        headers: { Authorization: `Bearer ${newSession.access_token}` },
        body: { inviteCode: inviteCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess({ orgName: data?.org?.name, role: data?.role });
      setStep('success');
      toast.success(data?.message || 'Successfully joined!');
      
      setTimeout(() => navigate('/listings'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen
  if (step === 'success' && success) {
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

  // Signup/Login form
  if (step === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={() => setStep('code')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Users className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>{hasAccount ? 'Sign In to Join' : 'Create Your Account'}</CardTitle>
            <CardDescription>
              {hasAccount 
                ? 'Sign in to your existing account to join the team' 
                : 'Set up your account to join the team'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-3 text-center mb-6">
              <p className="text-xs text-muted-foreground mb-1">Invite code</p>
              <code className="font-mono text-sm">{inviteCode}</code>
            </div>

            <form onSubmit={hasAccount ? handleLogin : handleSignup} className="space-y-4">
              {!hasAccount && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={hasAccount ? '••••••••' : 'At least 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {hasAccount ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  hasAccount ? 'Sign In & Join' : 'Create Account & Join'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setHasAccount(!hasAccount)}
                className="text-sm"
              >
                {hasAccount ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial code entry screen
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
          <div className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={12}
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleContinue} 
              className="w-full" 
              disabled={isLoading || !inviteCode.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <div className="mt-6 pt-4 border-t border-border text-center">
            <Button variant="link" onClick={() => navigate('/auth')}>
              Already have access? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
