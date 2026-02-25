import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, UserPlus, Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProspectIdeas, type ProspectIdea } from '@/hooks/useProspectIdeas';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { format } from 'date-fns';
import { AddProspectIdeaDialog } from './AddProspectIdeaDialog';

export function ProspectIdeasSection() {
  const { ideas, isLoading, deleteIdea } = useProspectIdeas();
  const [expanded, setExpanded] = useState(true);
  const [convertIdea, setConvertIdea] = useState<ProspectIdea | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="border-2 border-foreground" style={{ borderRadius: 'var(--radius)' }}>
      <div className="flex items-center justify-between pr-2">
        <button
          className="flex-1 flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="font-bold uppercase tracking-wider text-sm">Saved Prospect Ideas</span>
            <Badge variant="outline" className="border-2 border-foreground font-bold text-xs">
              {ideas.length}
            </Badge>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs border-2 border-foreground font-bold shrink-0"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {expanded && (
        <div className="border-t-2 border-foreground">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : ideas.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No saved prospect ideas yet. Search for contacts above and click "Save Idea", or click Add to add manually.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground bg-muted/40">
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Name</th>
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Title</th>
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Company</th>
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Email</th>
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Phone</th>
                    <th className="text-left p-3 font-bold uppercase tracking-wider text-xs">Saved</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ideas.map((idea) => (
                    <tr key={idea.id} className="border-b border-foreground/10 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium">{idea.name}</td>
                      <td className="p-3 text-muted-foreground">{idea.title ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{idea.company ?? '—'}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[180px]">{idea.email ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{idea.phone ?? '—'}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {format(new Date(idea.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-2 border-foreground font-bold"
                            onClick={() => setConvertIdea(idea)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Convert
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteIdea.mutate(idea.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {convertIdea && (
        <ProspectFormDialog
          open={!!convertIdea}
          onOpenChange={(open) => { if (!open) setConvertIdea(null); }}
          prefill={{
            name: convertIdea.name,
            email: convertIdea.email ?? undefined,
            phone: convertIdea.phone ?? undefined,
            company: convertIdea.company ?? undefined,
          }}
        />
      )}

      <AddProspectIdeaDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
