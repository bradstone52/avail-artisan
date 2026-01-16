import { useState } from 'react';
import { useInvites, Invite, CreateInviteParams } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Ban,
  Loader2,
  Check,
  Link,
  Mail,
  Globe,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function InviteManagement() {
  const {
    invites,
    loading,
    creating,
    fetchInvites,
    createInvite,
    revokeInvite,
    regenerateInvite,
    getInviteStatus,
    getInviteLink,
  } = useInvites();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<CreateInviteParams>({
    role: 'member',
  });

  const handleCreateInvite = async () => {
    const result = await createInvite(newInvite);
    if (result) {
      setShowCreateDialog(false);
      setNewInvite({ role: 'member' });
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLink = async (code: string) => {
    const link = getInviteLink(code);
    await navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const getStatusBadge = (invite: Invite) => {
    const status = getInviteStatus(invite);
    switch (status) {
      case 'used':
        return <Badge className="bg-green-600">Used</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="outline" className="border-primary text-primary">Active</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary">Admin</Badge>;
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {invites.length} invite{invites.length !== 1 ? 's' : ''} created
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvites}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invite</DialogTitle>
                <DialogDescription>
                  Generate a single-use invite code for a new team member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newInvite.role}
                    onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Restrict to Email (optional)
                  </Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newInvite.invited_email || ''}
                    onChange={(e) => setNewInvite({ ...newInvite, invited_email: e.target.value || undefined })}
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, only this email can redeem the invite.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Restrict to Domain (optional)
                  </Label>
                  <Input
                    type="text"
                    placeholder="company.com"
                    value={newInvite.invited_domain || ''}
                    onChange={(e) => setNewInvite({ ...newInvite, invited_domain: e.target.value || undefined })}
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, only emails from this domain can redeem.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expires At (optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={newInvite.expires_at || ''}
                    onChange={(e) => setNewInvite({ ...newInvite, expires_at: e.target.value || undefined })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvite} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Invite'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invites Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Restrictions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No invites yet. Create one to invite team members.
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => {
                const status = getInviteStatus(invite);
                return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {invite.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyCode(invite.code, invite.id)}
                          title="Copy code"
                        >
                          {copiedId === invite.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyLink(invite.code)}
                          title="Copy invite URL"
                        >
                          <Link className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invite)}</TableCell>
                    <TableCell>{getRoleBadge(invite.role)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {invite.invited_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {invite.invited_email}
                          </span>
                        )}
                        {invite.invited_domain && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            @{invite.invited_domain}
                          </span>
                        )}
                        {invite.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                        {!invite.invited_email && !invite.invited_domain && !invite.expires_at && (
                          <span className="italic">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(invite.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {invite.used_at ? (
                        <div className="text-xs">
                          <div>{invite.used_by_email}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(invite.used_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyCode(invite.code, invite.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(invite.code)}>
                            <Link className="w-4 h-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          {status === 'unused' && (
                            <>
                              <DropdownMenuItem onClick={() => regenerateInvite(invite.id)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Regenerate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => revokeInvite(invite.id)}
                                className="text-destructive"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
