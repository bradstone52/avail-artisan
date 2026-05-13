import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { useClauseLibrary, useCreateClause, useUpdateClause, useDeleteClause } from '@/hooks/useClauseLibrary';
import type { ClauseLibraryItem } from '@/types/database';

interface ClauseLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  onInsert: (content: string) => void;
}

export function ClauseLibrarySheet({
  open,
  onOpenChange,
  documentType,
  onInsert,
}: ClauseLibrarySheetProps) {
  const { data: clauses = [], isLoading } = useClauseLibrary(documentType);
  const createClause = useCreateClause();
  const updateClause = useUpdateClause();
  const deleteClause = useDeleteClause();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ClauseLibraryItem | null>(null);

  function handleInsert(clause: ClauseLibraryItem) {
    onInsert(clause.content);
    onOpenChange(false);
  }

  function startEdit(clause: ClauseLibraryItem) {
    setEditingId(clause.id);
    setEditTitle(clause.title);
    setEditContent(clause.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    await updateClause.mutateAsync({ id: editingId, title: editTitle, content: editContent });
    cancelEdit();
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createClause.mutateAsync({ title: newTitle, content: newContent, document_type: documentType });
    setNewTitle('');
    setNewContent('');
    setShowNewForm(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteClause.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Clause Library</SheetTitle>
          </SheetHeader>

          <div className="mb-4">
            {!showNewForm ? (
              <Button size="sm" variant="outline" onClick={() => setShowNewForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Clause
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Standard Parking"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Content</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={5}
                    placeholder="Clause text..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={createClause.isPending || !newTitle.trim() || !newContent.trim()}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewForm(false); setNewTitle(''); setNewContent(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : clauses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No clauses yet. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {clauses.map((clause) => (
                <div
                  key={clause.id}
                  className="border rounded-lg p-3 hover:bg-accent/30 transition-colors"
                >
                  {editingId === clause.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="font-medium"
                      />
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateClause.isPending}>
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <button
                          className="text-sm font-semibold text-left hover:text-primary transition-colors flex-1"
                          onClick={() => handleInsert(clause)}
                        >
                          {clause.title}
                        </button>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => startEdit(clause)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(clause)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{clause.content}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-6 text-xs px-2 text-primary"
                        onClick={() => handleInsert(clause)}
                      >
                        Insert
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clause?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed from the clause library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
