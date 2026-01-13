import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

interface InviteCodeCardProps {
  inviteCode: string | null;
  orgName: string | null;
}

export function InviteCodeCard({ inviteCode, orgName }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!inviteCode) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Team Invite Code</CardTitle>
        </div>
        <CardDescription>
          Share this code with team members to let them join {orgName || 'your organization'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input
            value={inviteCode}
            readOnly
            className="font-mono text-lg tracking-wider text-center"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          New members can join at <code className="bg-muted px-1 rounded">/join-team</code>
        </p>
      </CardContent>
    </Card>
  );
}
