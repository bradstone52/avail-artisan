import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldOff, QrCode, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MfaEnrollmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
  mandatory?: boolean;
  onCancel?: () => void;
}

export function MfaEnrollment({ open, onOpenChange, onEnrolled, mandatory = false, onCancel }: MfaEnrollmentProps) {
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const qrCodeSrc = qrCode
    ? (qrCode.startsWith('data:')
        ? qrCode
        : `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`)
    : '';

  useEffect(() => {
    if (open) {
      startEnrollment();
    } else {
      // Reset state when dialog closes
      setStep('qr');
      setQrCode('');
      setSecret('');
      setFactorId('');
      setCode('');
    }
  }, [open]);

  const startEnrollment = async () => {
    setIsLoading(true);
    try {
      // First check if user already has factors enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      
      if (verifiedFactors.length > 0) {
        // User already has MFA - they should be verifying, not enrolling
        // This can happen if the auth flow state gets confused
        toast.info('You already have 2FA enabled. Please verify.');
        onEnrolled(); // Trigger the enrolled callback to move to verification
        return;
      }

      // Check for unverified factors and unenroll them first
      const unverifiedFactors = factorsData?.totp?.filter(f => f.status !== 'verified') || [];
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const enrollOnce = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Logistics-Space.net',
          issuer: 'Logistics-Space.net',
        });
        if (error) throw error;
        return data;
      };

      let enrollData: any;
      try {
        enrollData = await enrollOnce();
      } catch (err: any) {
        // If a previous/stale factor exists with the same friendly name,
        // remove it and retry to generate a fresh QR code.
        if (err?.code === 'mfa_factor_name_conflict') {
          const { data: factorsAgain } = await supabase.auth.mfa.listFactors();
          const allTotp = (factorsAgain?.totp || []) as any[];
          const conflicting = allTotp.find(
            (f) => (f?.friendly_name || '').toLowerCase() === 'logistics-space.net'
          );
          if (conflicting?.id) {
            await supabase.auth.mfa.unenroll({ factorId: conflicting.id });
            enrollData = await enrollOnce();
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      if (enrollData?.totp) {
        setQrCode(enrollData.totp.qr_code);
        setSecret(enrollData.totp.secret);
        setFactorId(enrollData.id);
      }
    } catch (error: any) {
      console.error('MFA enrollment error:', error);
      toast.error(error.message || 'Failed to start enrollment');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Create a challenge for the new factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify the challenge to complete enrollment
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        if (verifyError.message.includes('Invalid')) {
          toast.error('Invalid code. Please check your authenticator app and try again.');
        } else {
          throw verifyError;
        }
        return;
      }

      toast.success('Two-factor authentication enabled successfully!');
      onEnrolled();
      onOpenChange(false);
    } catch (error: any) {
      console.error('MFA verify error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    toast.success('Secret copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // If mandatory, render as a Card instead of Dialog
  if (mandatory) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-xl shadow-md flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Two-factor authentication is required to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !qrCode ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : step === 'qr' ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                </p>
                
                 {qrCode && (
                  <div className="inline-block p-4 bg-white rounded-lg shadow-inner border-2 border-border">
                     <img src={qrCodeSrc} alt="QR Code for 2FA" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all text-center">
                    {secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setStep('verify')}
                className="w-full"
              >
                I've scanned the QR code
              </Button>
              
              {onCancel && (
                <Button
                  variant="secondary"
                  onClick={onCancel}
                  className="w-full"
                >
                  Cancel & Sign Out
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to complete setup:
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="verify-code" className="text-xs font-bold uppercase tracking-wider">
                  Verification Code
                </Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep('qr')}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Enable 2FA'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Enable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Secure your account with an authenticator app
          </DialogDescription>
        </DialogHeader>

        {isLoading && !qrCode ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : step === 'qr' ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
              </p>
              
               {qrCode && (
                <div className="inline-block p-4 bg-white rounded-lg shadow-inner border-2 border-border">
                   <img src={qrCodeSrc} alt="QR Code for 2FA" className="w-48 h-48" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all text-center">
                  {secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={() => setStep('verify')}
              className="w-full"
            >
              I've scanned the QR code
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to complete setup:
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="verify-code" className="text-xs font-bold uppercase tracking-wider">
                Verification Code
              </Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('qr')}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MfaSettingsCardProps {
  isEnabled: boolean;
  onEnableClick: () => void;
  onDisableClick: () => void;
  isLoading?: boolean;
}

export function MfaSettingsCard({ isEnabled, onEnableClick, onDisableClick, isLoading }: MfaSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {isEnabled 
            ? 'Your account is protected with two-factor authentication'
            : 'Add an extra layer of security to your account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                2FA is enabled
              </span>
            </div>
            <Button
              variant="destructive"
              onClick={onDisableClick}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use an authenticator app like Google Authenticator, Authy, or 1Password to generate one-time codes.
            </p>
            <Button
              onClick={onEnableClick}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Enable 2FA
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
