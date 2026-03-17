import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrg } from '@/hooks/useOrg';
import { useInternalListings } from '@/hooks/useInternalListings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Eye,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEffect } from 'react';

interface PublicInquiry {
  id: string;
  listing_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  created_at: string;
  listing_address?: string;
}

export default function AdminPublicMarket() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();
  const { listings, isLoading: listingsLoading } = useInternalListings();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied. Admins only.');
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  // Fetch public inquiries
  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery({
    queryKey: ['public-inquiries', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_listing_inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PublicInquiry[];
    },
    enabled: !!orgId && isAdmin,
  });

  // Toggle website_published
  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('internal_listings')
        .update({ website_published: published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { published }) => {
      queryClient.invalidateQueries({ queryKey: ['internal-listings'] });
      queryClient.invalidateQueries({ queryKey: ['public-listings'] });
      toast.success(published ? 'Listing published to website' : 'Listing unpublished');
    },
    onError: () => toast.error('Failed to update listing'),
  });

  const publishedListings = listings.filter((l) => (l as any).website_published);
  const activeListings = listings.filter((l) => l.status === 'Active');

  const publicUrl = `${window.location.origin}/market`;

  if (roleLoading || listingsLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Public Market Website</h1>
              <p className="text-muted-foreground text-sm">Manage your public listing portal</p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2 self-start sm:self-auto">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Open Public Site
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{publishedListings.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{activeListings.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{inquiries.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Inquiries</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Building2 className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{listings.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings" className="gap-2">
              <Building2 className="w-4 h-4" />
              Manage Listings
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Inquiries
              {inquiries.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {inquiries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2">
              <Globe className="w-4 h-4" />
              Domain
            </TabsTrigger>
          </TabsList>

          {/* Listings tab */}
          <TabsContent value="listings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publish / Unpublish Listings</CardTitle>
                <CardDescription>
                  Toggle the switch to show or hide listings on the public website. Only Active listings are shown publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Published</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No listings found
                        </TableCell>
                      </TableRow>
                    )}
                    {listings.map((listing) => {
                      const isPublished = !!(listing as any).website_published;
                      const isActive = listing.status === 'Active';
                      return (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <div>
                              <Link
                                to={`/internal-listings/${listing.id}`}
                                className="font-medium text-sm hover:underline text-foreground"
                              >
                                {listing.display_address || listing.address}
                              </Link>
                              <p className="text-xs text-muted-foreground">{listing.city}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {listing.property_type || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {listing.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {listing.size_sf ? `${listing.size_sf.toLocaleString()} SF` : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPublished && isActive && (
                                <a
                                  href={`${publicUrl}/${listing.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                  title="View on public site"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              )}
                              <Switch
                                checked={isPublished}
                                onCheckedChange={(checked) =>
                                  togglePublish.mutate({ id: listing.id, published: checked })
                                }
                                disabled={togglePublish.isPending}
                                title={
                                  !isActive
                                    ? 'Only Active listings are shown publicly'
                                    : isPublished
                                    ? 'Unpublish from website'
                                    : 'Publish to website'
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries tab */}
          <TabsContent value="inquiries" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Public Inquiries</CardTitle>
                <CardDescription>
                  Contact submissions received through the public listing website.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {inquiriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : inquiries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No inquiries yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Listing</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inquiries.map((inq) => {
                        const listing = listings.find((l) => l.id === inq.listing_id);
                        return (
                          <TableRow key={inq.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{inq.name}</p>
                                <a
                                  href={`mailto:${inq.email}`}
                                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                                >
                                  <Mail className="w-3 h-3" />
                                  {inq.email}
                                </a>
                                {inq.phone && (
                                  <a
                                    href={`tel:${inq.phone}`}
                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {inq.phone}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {inq.company || '—'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {listing ? (
                                <Link
                                  to={`/internal-listings/${listing.id}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {listing.display_address || listing.address}
                                </Link>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground max-w-xs truncate">
                                {inq.message || '—'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                {format(new Date(inq.created_at), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domain tab */}
          <TabsContent value="domain" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Public Site URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all">
                    {publicUrl}
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Connect industrialmarket.ca
                  </CardTitle>
                  <CardDescription>
                    Point your domain to this app to serve the public market at industrialmarket.ca/market
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <ol className="space-y-3 list-none">
                    {[
                      'Go to Project Settings → Domains',
                      'Click Connect Domain and enter industrialmarket.ca',
                      'Add the provided A record (185.158.133.1) and TXT record at your registrar',
                      'Also add www.industrialmarket.ca as a separate entry',
                      'Wait up to 72 hours for DNS propagation',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
