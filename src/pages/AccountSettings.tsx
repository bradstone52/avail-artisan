import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/hooks/useMfa';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, User, Mail, ShieldCheck } from 'lucide-react';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnabled: mfaEnabled, loading: mfaLoading } = useMfa();

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

          {/* MFA Settings Card - Always show as enabled, no disable option */}
          {mfaLoading ? (
            <Card>
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Two-factor authentication is mandatory for all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    2FA is enabled and required
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
