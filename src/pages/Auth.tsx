import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2, Mail, Lock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { MfaVerification } from '@/components/auth/MfaVerification';
import { MfaEnrollment } from '@/components/auth/MfaEnrollment';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !showMfaVerification && !showMfaEnrollment) {
      checkMfaAndNavigate();
    }
  }, [user, showMfaVerification, showMfaEnrollment]);

  const checkMfaAndNavigate = async () => {
    if (!user) return;

    try {
      // Check if user has MFA enabled and needs verification
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      const hasMfaEnabled = verifiedFactors.length > 0;
      
      if (!hasMfaEnabled) {
        // User doesn't have MFA - force enrollment (mandatory)
        setShowMfaEnrollment(true);
        return;
      }
      
      if (hasMfaEnabled && aalData?.currentLevel === 'aal1') {
        // User has MFA but hasn't verified this session
        setShowMfaVerification(true);
        return;
      }

      // MFA enabled and verified, proceed to dashboard
      navigateAfterAuth();
    } catch (error) {
      console.error('Error checking MFA status:', error);
      navigateAfterAuth();
    }
  };

  const navigateAfterAuth = () => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      navigate('/join');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      // checkMfaAndNavigate will be called by useEffect when user changes
    }
  };

  const handleMfaVerified = () => {
    setShowMfaVerification(false);
    toast.success('Authentication complete!');
    navigateAfterAuth();
  };

  const handleMfaEnrolled = () => {
    setShowMfaEnrollment(false);
    toast.success('Two-factor authentication enabled!');
    navigateAfterAuth();
  };

  const handleMfaCancel = async () => {
    // Sign out the user if they cancel MFA verification or enrollment
    await supabase.auth.signOut();
    setShowMfaVerification(false);
    setShowMfaEnrollment(false);
    toast.info('Login cancelled');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="border-2 border-foreground p-4 shadow-[4px_4px_0_hsl(var(--foreground))]" style={{ borderRadius: "var(--radius)" }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show MFA enrollment screen (mandatory for new users without MFA)
  if (showMfaEnrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 border-3 border-foreground bg-primary shadow-[6px_6px_0_hsl(var(--foreground))] mb-6" style={{ borderRadius: "var(--radius)" }}>
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
              Distribution Snapshot
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Two-factor authentication is required
            </p>
          </div>
          <MfaEnrollment 
            open={true}
            onOpenChange={() => {}} // Cannot be dismissed
            onEnrolled={handleMfaEnrolled}
            mandatory={true}
            onCancel={handleMfaCancel}
          />
        </div>
      </div>
    );
  }

  // Show MFA verification screen
  if (showMfaVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 border-3 border-foreground bg-primary shadow-[6px_6px_0_hsl(var(--foreground))] mb-6" style={{ borderRadius: "var(--radius)" }}>
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
              Distribution Snapshot
            </h1>
          </div>
          <MfaVerification 
            onVerified={handleMfaVerified} 
            onCancel={handleMfaCancel} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 border-3 border-foreground bg-primary shadow-[6px_6px_0_hsl(var(--foreground))] mb-6" style={{ borderRadius: "var(--radius)" }}>
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
            Distribution Snapshot
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Industrial CRE market intelligence
          </p>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-11"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Invite-only notice */}
            <div className="mt-6 pt-6 border-t-2 border-border-subtle">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3 font-medium">
                  New to the platform? You need an invite to join.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/join')}
                  className="w-full"
                >
                  I have an invite code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
