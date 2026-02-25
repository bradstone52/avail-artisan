import { useState } from 'react';
import { Search, User, Building2, Loader2, AlertCircle, Info } from 'lucide-react';
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

  // Person lookup state
  const [personName, setPersonName] = useState('');
  const [personCompany, setPersonCompany] = useState('');

  // Company search state
  const [companyName, setCompanyName] = useState('');
  const [titleFilter, setTitleFilter] = useState('');

  const { loading, error, personResult, peopleResults, lookupPerson, searchPeople, clearResults } = useContactFinder();
  const { addIdea } = useProspectIdeas();

  const handlePersonLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() && !personCompany.trim()) return;
    lookupPerson({ name: personName.trim() || undefined, company: personCompany.trim() || undefined });
  };

  const handleCompanySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    searchPeople({ company: companyName.trim(), title: titleFilter.trim() || undefined });
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
    clearResults();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Contact Finder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by RocketReach — credits are only used for successful lookups.
          </p>
        </div>
        <div
          className="flex border-2 border-foreground overflow-hidden shrink-0"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <button
            onClick={() => switchMode('person')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              mode === 'person' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Person
          </button>
          <button
            onClick={() => switchMode('company')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors border-l-2 border-foreground ${
              mode === 'company' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Company
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="border-2 border-foreground bg-card p-5" style={{ borderRadius: 'var(--radius)' }}>
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
              className="border-2 border-foreground font-bold shadow-[3px_3px_0_hsl(var(--foreground))]"
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
              className="border-2 border-foreground font-bold shadow-[3px_3px_0_hsl(var(--foreground))]"
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
          className="flex items-start gap-3 p-4 border-2 border-destructive bg-destructive/10 text-destructive text-sm"
          style={{ borderRadius: 'var(--radius)' }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {!loading && mode === 'person' && personResult !== null && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Result</p>
          <ContactResultCard
            contact={personResult}
            onSave={handleSave}
            isSaving={addIdea.isPending}
          />
        </div>
      )}

      {!loading && mode === 'person' && personResult === null && !error && !loading && (
        // Only show "no result" message if a search was completed
        null
      )}

      {!loading && mode === 'company' && peopleResults.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {peopleResults.length} Result{peopleResults.length !== 1 ? 's' : ''}
          </p>
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
        </div>
      )}

      {/* Saved Ideas */}
      <ProspectIdeasSection />
    </div>
  );
}
