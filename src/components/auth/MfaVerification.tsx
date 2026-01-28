import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

interface MfaVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export function MfaVerification({ onVerified, onCancel }: MfaVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const performVerification = async (verifyCode: string) => {
    if (verifyCode.length !== 6 || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      // Get the current factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        throw factorsError;
      }

      const totpFactor = factorsData?.totp?.[0];
      if (!totpFactor) {
        throw new Error('No TOTP factor found');
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) {
        if (verifyError.message.includes('Invalid')) {
          toast.error('Invalid verification code. Please try again.');
          setCode('');
        } else {
          throw verifyError;
        }
        return;
      }

      toast.success('Verification successful!');
      onVerified();
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error(error.message || 'Verification failed');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(newCode);
    
    // Auto-verify when 6 digits are entered
    if (newCode.length === 6) {
      performVerification(newCode);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(code);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 border-3 border-foreground bg-primary shadow-[4px_4px_0_hsl(var(--foreground))] flex items-center justify-center" style={{ borderRadius: "var(--radius)" }}>
          <ShieldCheck className="w-8 h-8 text-primary-foreground" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code" className="text-xs font-bold uppercase tracking-wider">
              Verification Code
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              disabled={isVerifying}
              autoComplete="one-time-code"
              autoFocus
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
