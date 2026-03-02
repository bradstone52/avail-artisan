import { useState } from 'react';
import { Search, User, Building2, Loader2, AlertCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContactFinder, type ContactResult } from '@/hooks/useContactFinder';
import { useProspectIdeas } from '@/hooks/useProspectIdeas';
import { ContactResultCard } from './ContactResultCard';
import { ProspectIdeasSection } from './ProspectIdeasSection';

type SearchMode = 'person' | 'company';

export function ContactFinderTab() {
  const [mode, setMode] = useState<SearchMode>('person');
  const [personName, setPersonName] = useState('');
  const [personCompany, setPersonCompany] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [lastCompanySearch, setLastCompanySearch] = useState<{ company: string; title?: string } | null>(null);

  const { loading, error, personResult, peopleResults, totalResults, currentPage, pageSize, lookupPerson, searchPeople, clearResults } = useContactFinder();
  const { addIdea } = useProspectIdeas();

  const totalPages = Math.ceil(totalResults / pageSize);

  const handlePersonLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() && !personCompany.trim()) return;
    lookupPerson({ name: personName.trim() || undefined, company: personCompany.trim() || undefined });
  };

  const handleCompanySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    const params = { company: companyName.trim(), title: titleFilter.trim() || undefined };
    setLastCompanySearch(params);
    searchPeople({ ...params, page: 1 });
  };

  const handlePageChange = (page: number) => {
    if (!lastCompanySearch) return;
    searchPeople({ ...lastCompanySearch, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = (contact: ContactResult) => {
    addIdea.mutate({
      name: contact.name ?? 'Unknown',
      title: contact.title,
      company: contact.company,
      email: contact.emails[0] ?? null,
      phone: contact.phones[0] ?? null,
      linkedin_url: contact.linkedin_url,
      source: 'RocketReach',
    });
  };

  const switchMode = (m: SearchMode) => {
    setMode(m);
    setLastCompanySearch(null);
    clearResults();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Contact Finder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by RocketReach — credits are only used for successful lookups.
          </p>
        </div>
        <div
          className="flex border border-border overflow-hidden shrink-0 rounded-lg"
        >
          <button
            onClick={() => switchMode('person')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'person' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Person
          </button>
          <button
            onClick={() => switchMode('company')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
              mode === 'company' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Company
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="border border-border bg-card p-5 rounded-lg">
        {mode === 'person' ? (
          <form onSubmit={handlePersonLookup} className="space-y-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Look up a specific individual by name and/or company.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="person-name">Full Name</Label>
                <Input
                  id="person-name"
                  placeholder="e.g. Jane Smith"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="person-company">Company / Domain</Label>
                <Input
                  id="person-company"
                  placeholder="e.g. CBRE or cbre.com"
                  value={personCompany}
                  onChange={(e) => setPersonCompany(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || (!personName.trim() && !personCompany.trim())}
              className=""
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Look Up
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCompanySearch} className="space-y-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Browse all contacts at a company, optionally filtered by title or role.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Company Name <span className="text-destructive">*</span></Label>
                <Input
                  id="company-name"
                  placeholder="e.g. JLL"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title-filter">Title / Role Filter (optional)</Label>
                <Input
                  id="title-filter"
                  placeholder="e.g. leasing, VP, director"
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !companyName.trim()}
              className=""
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </form>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Person result */}
      {!loading && mode === 'person' && personResult !== null && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Result</p>
          <ContactResultCard
            contact={personResult}
            onSave={handleSave}
            isSaving={addIdea.isPending}
          />
        </div>
      )}

      {/* Company results */}
      {mode === 'company' && (peopleResults.length > 0 || loading) && (
        <div className="space-y-3">
          {!loading && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {peopleResults.length} of {totalResults.toLocaleString()} Result{totalResults !== 1 ? 's' : ''}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading contacts…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {peopleResults.map((contact, i) => (
                <ContactResultCard
                  key={contact.id ?? i}
                  contact={contact}
                  onSave={handleSave}
                  isSaving={addIdea.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Ideas */}
      <ProspectIdeasSection />
    </div>
  );
}
