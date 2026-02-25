import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProspectIdeas, type ProspectIdeaInsert } from '@/hooks/useProspectIdeas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProspectIdeaDialog({ open, onOpenChange }: Props) {
  const { addIdea } = useProspectIdeas();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProspectIdeaInsert>();

  const onSubmit = (data: ProspectIdeaInsert) => {
    addIdea.mutate(
      { ...data, source: 'Manual' },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold uppercase tracking-wider text-sm">Add Prospect Idea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="idea-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="idea-name"
              {...register('name', { required: true })}
              placeholder="Full name"
              className={errors.name ? 'border-destructive' : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="idea-title">Title</Label>
              <Input id="idea-title" {...register('title')} placeholder="e.g. VP Logistics" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idea-company">Company</Label>
              <Input id="idea-company" {...register('company')} placeholder="Company name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="idea-email">Email</Label>
              <Input id="idea-email" type="email" {...register('email')} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idea-phone">Phone</Label>
              <Input id="idea-phone" {...register('phone')} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idea-linkedin">LinkedIn URL</Label>
            <Input id="idea-linkedin" {...register('linkedin_url')} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idea-notes">Notes</Label>
            <Textarea id="idea-notes" {...register('notes')} placeholder="Any notes…" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={addIdea.isPending}
              className="border-2 border-foreground font-bold shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              Save Idea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
