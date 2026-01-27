import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/hooks/useMfa';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, User, Mail } from 'lucide-react';
import { MfaEnrollment, MfaSettingsCard } from '@/components/auth/MfaEnrollment';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnabled: mfaEnabled, loading: mfaLoading, refresh: refreshMfa, disableMfa } = useMfa();
  
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisableMfa = async () => {
    setIsDisabling(true);
    const { error } = await disableMfa();
    setIsDisabling(false);
    setShowDisableConfirm(false);

    if (error) {
      toast.error(error.message || 'Failed to disable 2FA');
    } else {
      toast.success('Two-factor authentication disabled');
    }
  };

  const handleEnrolled = () => {
    refreshMfa();
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">Manage your account and security preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MFA Settings Card */}
          {mfaLoading ? (
            <Card>
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <MfaSettingsCard
              isEnabled={mfaEnabled}
              onEnableClick={() => setShowEnrollment(true)}
              onDisableClick={() => setShowDisableConfirm(true)}
              isLoading={isDisabling}
            />
          )}
        </div>

        {/* MFA Enrollment Dialog */}
        <MfaEnrollment
          open={showEnrollment}
          onOpenChange={setShowEnrollment}
          onEnrolled={handleEnrolled}
        />

        {/* Disable MFA Confirmation */}
        <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the extra layer of security from your account. You can re-enable it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisableMfa}
                disabled={isDisabling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
