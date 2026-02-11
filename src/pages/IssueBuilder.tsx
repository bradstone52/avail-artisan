import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WizardSteps } from "@/components/issue-builder/WizardSteps";
import { IssueSettingsStep } from "@/components/issue-builder/IssueSettingsStep";
import { SelectListingsStep } from "@/components/issue-builder/SelectListingsStep";
import { GenerateContentStep } from "@/components/issue-builder/GenerateContentStep";
import { PreviewStep } from "@/components/issue-builder/PreviewStep";
import { ShareStep } from "@/components/issue-builder/ShareStep";
import { useDistributionListings } from "@/hooks/useDistributionListings";
import { useIssues } from "@/hooks/useIssues";
import { IssueSettings, Issue } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const WIZARD_STEPS = [
  { id: "settings", title: "Settings", description: "Issue configuration" },
  { id: "listings", title: "Listings", description: "Select properties" },
  { id: "content", title: "Content", description: "Generate notes" },
  { id: "preview", title: "Preview", description: "Review PDF" },
  { id: "share", title: "Share", description: "Download & share" },
];

export default function IssueBuilder() {
  const navigate = useNavigate();
  const { listings, loading: listingsLoading } = useDistributionListings();
  const { createIssue, getLatestIssue } = useIssues();

  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<Issue | null>(null);

  // Form state
  // Default cover image from the most recent issue with one
  const DEFAULT_COVER_IMAGE = "https://vouzfwrumlhmtmgglsti.supabase.co/storage/v1/object/public/cover-images/6e06384f-66ad-414f-bfb4-3d519cac090a/cover-1768534872718.png";

  const [settings, setSettings] = useState<IssueSettings>({
    title: `Large-Format Distribution Availability — ${format(new Date(), "MMMM yyyy")}`,
    market: "Calgary Region",
    sizeThreshold: 100000,
    sizeThresholdMax: 500000,
    sortOrder: "size_desc",
    brokerageName: "ClearView Commercial Realty Inc.",
    logoUrl:
      "https://static.wixstatic.com/media/61f242_c5db9313e4e7406b98b65af86d332a61~mv2.png/v1/fill/w_734,h_128,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Clearview_CRI_Logo_HORZ_FC_KO_CMYK_edited.png",
    coverImageUrl: DEFAULT_COVER_IMAGE,
    primaryContactName: "Brad Stone",
    primaryContactTitle: "Partner, Associate Broker",
    primaryContactEmail: "brad@cvpartners.ca",
    primaryContactPhone: "(403) 613-2898",
    secondaryContactName: "Doug Johannson",
    secondaryContactTitle: "Partner, Senior Vice President",
    secondaryContactEmail: "doug@cvpartners.ca",
    secondaryContactPhone: "(403) 470-8875",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [executiveNotes, setExecutiveNotes] = useState<Record<string, string>>({});
  const [changeStatus, setChangeStatus] = useState<Record<string, "new" | "changed" | "unchanged">>({});

  // Auto-select eligible listings when moving to step 2
  useEffect(() => {
    if (currentStep === 1 && selectedIds.length === 0) {
      const eligible = listings.filter(
        (l) => l.status === "Active" && l.include_in_issue && 
               l.size_sf >= settings.sizeThreshold && 
               l.size_sf <= settings.sizeThresholdMax,
      );
      setSelectedIds(eligible.map((l) => l.id));

      // Determine change status (all "new" for first issue)
      const latest = getLatestIssue();
      const statusMap: Record<string, "new" | "changed" | "unchanged"> = {};
      eligible.forEach((l) => {
        statusMap[l.id] = latest ? "new" : "unchanged";
      });
      setChangeStatus(statusMap);
    }
  }, [currentStep, listings, settings.sizeThreshold, settings.sizeThresholdMax, getLatestIssue]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return settings.market.trim().length > 0;
      case 1:
        return selectedIds.length > 0;
      case 2:
        return Object.keys(executiveNotes).length === selectedIds.length;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      // Create issue
      await handleCreateIssue();
    } else if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateIssue = async () => {
    setIsCreating(true);
    try {
      const title = settings.title || `Large-Format Distribution Availability — ${format(new Date(), "MMMM yyyy")}`;

      const newCount = Object.values(changeStatus).filter((s) => s === "new").length;
      const changedCount = Object.values(changeStatus).filter((s) => s === "changed").length;

      // Prepare issue_listings data
      const issueListingsData = selectedIds.map((listingId, index) => ({
        listing_id: listingId,
        change_status: changeStatus[listingId] || null,
        executive_note: executiveNotes[listingId] || null,
        sort_order: index,
      }));

      const issue = await createIssue(
        {
          title,
          market: settings.market,
          size_threshold: settings.sizeThreshold,
          sort_order: settings.sortOrder,
          brokerage_name: settings.brokerageName || null,
          logo_url: settings.logoUrl || null,
          cover_image_url: settings.coverImageUrl || null,
          primary_contact_name: settings.primaryContactName || null,
          primary_contact_title: settings.primaryContactTitle || null,
          primary_contact_email: settings.primaryContactEmail || null,
          primary_contact_phone: settings.primaryContactPhone || null,
          secondary_contact_name: settings.secondaryContactName || null,
          secondary_contact_title: settings.secondaryContactTitle || null,
          secondary_contact_email: settings.secondaryContactEmail || null,
          secondary_contact_phone: settings.secondaryContactPhone || null,
          total_listings: selectedIds.length,
          new_count: newCount,
          changed_count: changedCount,
          removed_count: 0,
          published_at: new Date().toISOString(),
        },
        issueListingsData,
      );

      setCreatedIssue(issue);
      setCurrentStep(4);
      toast.success("Issue created successfully!");
    } catch (error) {
      toast.error("Failed to create issue");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  if (listingsLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (listings.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Distribution Listings Available</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              You need to add distribution warehouse listings before creating an issue. Go to Market Listings and mark properties as distribution warehouses.
            </p>
            <Button onClick={() => navigate("/market-listings")}>Go to Market Listings</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Create Issue</h1>
          <p className="text-muted-foreground mt-1">Build your distribution market snapshot</p>
        </div>

        {/* Wizard Steps */}
        <WizardSteps
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={(index) => {
            if (index < currentStep) setCurrentStep(index);
          }}
        />

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 0 && <IssueSettingsStep settings={settings} onChange={setSettings} />}
          {currentStep === 1 && (
            <SelectListingsStep
              listings={listings}
              selectedIds={selectedIds}
              sizeThreshold={settings.sizeThreshold}
              onSelectionChange={setSelectedIds}
            />
          )}
          {currentStep === 2 && (
            <GenerateContentStep
              listings={listings}
              selectedIds={selectedIds}
              executiveNotes={executiveNotes}
              onNotesChange={setExecutiveNotes}
            />
          )}
          {currentStep === 3 && (
            <PreviewStep
              settings={settings}
              listings={listings}
              selectedIds={selectedIds}
              executiveNotes={executiveNotes}
              changeStatus={changeStatus}
            />
          )}
          {currentStep === 4 && (
            <ShareStep
              issue={createdIssue}
              settings={settings}
              listingsCount={selectedIds.length}
              listings={listings}
              selectedIds={selectedIds}
              executiveNotes={executiveNotes}
              changeStatus={changeStatus}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 4 && (
            <Button onClick={handleNext} disabled={!canProceed() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : currentStep === 3 ? (
                "Create Issue"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {currentStep === 4 && <Button onClick={() => navigate("/dashboard")}>Done</Button>}
        </div>
      </div>
    </AppLayout>
  );
}
