import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { useMarketListings } from '@/hooks/useMarketListings';
import { useOrg } from '@/hooks/useOrg';
import { useIssues } from '@/hooks/useIssues';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet, 
  Building2, 
  FilePlus, 
  Sparkles,
  Trash2,
  MapPin,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { listings, loading: listingsLoading } = useMarketListings();
  const { orgName } = useOrg();
  const { issues, loading: issuesLoading, refreshIssues, deleteAllIssues } = useIssues();

  const handleClearIssues = async () => {
    if (issues.length === 0) {
      toast.info('No issues to clear');
      return;
    }
    try {
      await deleteAllIssues();
      toast.success('All issues cleared');
    } catch (error) {
      console.error('Error clearing issues:', error);
      toast.error('Failed to clear issues');
    }
  };

  const activeListings = listings.filter(l => l.status === 'Active');
  const distributionListings = listings.filter(l => l.is_distribution_warehouse);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your distribution market intelligence
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/market-listings')}>
              <Database className="w-4 h-4 mr-2" />
              Market Listings
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/issue-builder')}>
              <FilePlus className="w-4 h-4 mr-2" />
              Create Issue
            </Button>
          </div>
        </div>

        {/* Create Issue CTA */}
        <div 
          className="mb-6 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
          style={{ borderRadius: "var(--radius)" }}
          onClick={() => navigate('/issue-builder')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary text-primary-foreground border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] group-hover:shadow-[4px_4px_0_hsl(var(--foreground))] transition-shadow" style={{ borderRadius: "var(--radius)" }}>
                <FilePlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Create New Issue</h2>
                <p className="text-muted-foreground">Generate a distribution market snapshot report</p>
              </div>
            </div>
            <Button size="lg" className="font-bold shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_hsl(var(--foreground))] transition-shadow">
              Get Started
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Issues */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Total Listings"
                value={listings.length}
                description="In your database"
                icon={<FileSpreadsheet className="w-5 h-5" />}
              />
              <StatCard
                title="Distribution Warehouses"
                value={distributionListings.length}
                description="Large-format properties"
                icon={<Building2 className="w-5 h-5" />}
                variant="primary"
              />
              <StatCard
                title="Issues Published"
                value={issues.length}
                description="Market snapshots"
                icon={<Sparkles className="w-5 h-5" />}
                variant="success"
                action={
                  issues.length > 0 ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearIssues}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : undefined
                }
              />
            </div>

            {/* Past Issues */}
            <div>
              <h2 className="text-lg font-display font-semibold mb-4">Recent Issues</h2>
              {issuesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                  <FilePlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No issues created yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/issue-builder')}
                    className="mt-2"
                  >
                    Create your first issue
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {issues.slice(0, 5).map(issue => (
                    <IssueCard 
                      key={issue.id} 
                      issue={issue}
                      onRefresh={refreshIssues}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => navigate('/market-listings')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Manage Market Listings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/market-listings-map" target="_blank" rel="noopener noreferrer">
                    <MapPin className="w-4 h-4 mr-2" />
                    Market Listings Map
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => navigate('/listings')}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Distribution Listings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/distribution-map" target="_blank" rel="noopener noreferrer">
                    <MapPin className="w-4 h-4 mr-2" />
                    Open Distribution Map
                  </a>
                </Button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3">Data Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active listings</span>
                  <span className="font-medium">{activeListings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geocoded</span>
                  <span className="font-medium">{listings.filter(l => l.latitude && l.longitude).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">With brochure links</span>
                  <span className="font-medium">{listings.filter(l => l.link).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
