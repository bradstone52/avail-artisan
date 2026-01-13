import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { StatCard } from '@/components/dashboard/StatCard';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { SheetConnectionCard } from '@/components/dashboard/SheetConnectionCard';
import { SyncReportSummary } from '@/components/dashboard/SyncReportSummary';
import { useWorkspaceConnection } from '@/hooks/useWorkspaceConnection';
import { useIssues } from '@/hooks/useIssues';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet, 
  Building2, 
  FilePlus, 
  Download,
  Sparkles
} from 'lucide-react';
import { generateTemplateCSV, generateSampleData, downloadCSV } from '@/lib/sheet-parser';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    connection, 
    listings, 
    loading: sheetLoading, 
    isSyncing,
    hasOAuthToken,
    isAdmin,
    lastSyncReportData,
    connectSheet, 
    connectOAuth,
    disconnectSheet, 
    syncListings 
  } = useWorkspaceConnection();
  const { issues, loading: issuesLoading, refreshIssues } = useIssues();

  const activeListings = listings.filter(l => l.status === 'Active');
  const includedListings = listings.filter(l => l.include_in_issue && l.status === 'Active');

  const checklistItems = [
    {
      id: 'connect',
      title: 'Connect Google Sheet',
      description: 'Link your distribution listings spreadsheet',
      completed: !!connection,
      action: () => {},
    },
    {
      id: 'sync',
      title: 'Sync Listings',
      description: 'Import property data from your sheet',
      completed: listings.length > 0,
      action: syncListings,
      actionLabel: 'Sync',
    },
    {
      id: 'create',
      title: 'Create Issue',
      description: 'Build your first distribution snapshot',
      completed: issues.length > 0,
      action: () => navigate('/issue-builder'),
      actionLabel: 'Create',
    },
    {
      id: 'generate',
      title: 'Generate PDF',
      description: 'Export a polished market report',
      completed: issues.some(i => i.pdf_url),
    },
    {
      id: 'share',
      title: 'Share Report',
      description: 'Distribute to your clients and team',
      completed: issues.some(i => i.is_public),
    },
  ];

  const handleDownloadTemplate = () => {
    downloadCSV(generateTemplateCSV(), 'distribution_template.csv');
    toast.success('Template downloaded');
  };

  const handleLoadSampleData = async () => {
    if (!connection) {
      toast.error('Please connect a sheet first');
      return;
    }
    // For demo purposes, we'll create a local sample
    toast.info('To load sample data, paste the sample CSV content into your Google Sheet');
    downloadCSV(generateSampleData(), 'sample_data.csv');
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your distribution market intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
            <Button onClick={() => navigate('/issue-builder')}>
              <FilePlus className="w-4 h-4 mr-2" />
              Create Issue
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
                title="Active Properties"
                value={activeListings.length}
                description="Currently available"
                icon={<Building2 className="w-5 h-5" />}
                variant="primary"
              />
              <StatCard
                title="Issues Published"
                value={issues.length}
                description="Market snapshots"
                icon={<Sparkles className="w-5 h-5" />}
                variant="success"
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

          {/* Right Column - Checklist, Connection, and Sync Report */}
          <div className="space-y-6">
            <OnboardingChecklist items={checklistItems} />
            
            {isAdmin && (
              <SheetConnectionCard
                connection={connection}
                onConnect={connectSheet}
                onSync={syncListings}
                onDisconnect={disconnectSheet}
                onConnectOAuth={connectOAuth}
                isSyncing={isSyncing}
                hasOAuthToken={hasOAuthToken}
                isAdmin={isAdmin}
              />
            )}
            
            {!isAdmin && connection && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display font-semibold mb-2">Data Source</h3>
                <p className="text-sm text-muted-foreground">
                  Connected to: <span className="font-medium text-foreground">{connection.sheet_name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact an admin to manage the data connection.
                </p>
              </div>
            )}

            {/* Sync Report Summary */}
            {lastSyncReportData && (
              <SyncReportSummary report={lastSyncReportData} />
            )}

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sheet Template
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleLoadSampleData}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Sample Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
