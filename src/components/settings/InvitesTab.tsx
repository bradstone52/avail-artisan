import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useInvites, Invite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';

export function InvitesTab() {
  const { invites, loading, creating, createInvite, revokeInvite, regenerateInvite, getInviteStatus, getInviteLink } = useInvites();

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(getInviteLink(code));
    toast.success('Invite link copied to clipboard');
  };

  const handleCreateInvite = async () => {
    await createInvite({ role: 'member' });
  };

  const statusBadge = (invite: Invite) => {
    const status = getInviteStatus(invite);
    switch (status) {
      case 'used':
        return <Badge variant="secondary">Used</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Invites</CardTitle>
          <CardDescription>Manage invite links for your team</CardDescription>
        </div>
        <Button onClick={handleCreateInvite} disabled={creating}>
          <Plus className="w-4 h-4 mr-2" />
          {creating ? 'Creating...' : 'New Invite'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading invites...</p>
        ) : invites.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No invites yet. Create one to invite team members.
          </p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => {
              const status = getInviteStatus(invite);
              const isActive = status === 'unused';
              
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                        {invite.code}
                      </code>
                      {statusBadge(invite)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {formatDate(invite.created_at)}
                      {invite.used_by_email && ` • Used by ${invite.used_by_email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(invite.code)}
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => revokeInvite(invite.id)}
                          title="Revoke"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {(status === 'expired' || status === 'revoked') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => regenerateInvite(invite.id)}
                        title="Regenerate"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
