import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Users, Loader2, ShieldAlert, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SyncScheduleSettings } from '@/components/admin/SyncScheduleSettings';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'admin' | 'sync_operator' | 'member' | null;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied. Admins only.');
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'sync_operator' | 'member') || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'sync_operator' | 'member' | 'none') => {
    if (userId === currentUser?.id) {
      toast.error("You can't change your own role");
      return;
    }

    setUpdating(userId);
    try {
      if (newRole === 'none') {
        // Remove all roles for this user
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Delete existing role first, then insert new one
        await supabase.from('user_roles').delete().eq('user_id', userId);
        
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        
        if (insertError) throw insertError;
      }

      toast.success('Role updated');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default" className="bg-primary">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case 'sync_operator':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Zap className="w-3 h-3 mr-1" />
            Sync Operator
          </Badge>
        );
      case 'member':
        return <Badge variant="secondary">Member</Badge>;
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <ShieldAlert className="w-3 h-3 mr-1" />
            No Role
          </Badge>
        );
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Manage users, roles, and sync schedules</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Sync Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {/* Role Legend */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Full access: connect Google, sync data, manage users, edit schedule
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-blue-600">
                  <Zap className="w-3 h-3 mr-1" />
                  Sync Operator
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Can run manual sync and view sync logs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Member</Badge>
                <span className="text-sm text-muted-foreground">
                  View listings, create issues, generate PDFs
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.full_name || 'No name'}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.id === currentUser?.id ? (
                          <span className="text-xs text-muted-foreground">Cannot edit self</span>
                        ) : (
                          <Select
                            value={user.role || 'none'}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value as 'admin' | 'sync_operator' | 'member' | 'none')
                            }
                            disabled={updating === user.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              {updating === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="sync_operator">Sync Operator</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="none">No Role</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <SyncScheduleSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
