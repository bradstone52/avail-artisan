import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRecipients, Recipient, RecipientInsert } from "@/hooks/useRecipients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm: RecipientInsert = {
  company_name: "",
  contact_name: "",
  title: null,
  email: "",
  notes: null,
};

export default function Recipients() {
  const { recipients, isLoading, createRecipient, updateRecipient, deleteRecipient } = useRecipients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipientInsert>(emptyForm);

  const openCreate = () => {
    setEditingRecipient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setForm({
      company_name: recipient.company_name,
      contact_name: recipient.contact_name,
      title: recipient.title,
      email: recipient.email,
      notes: recipient.notes,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipient) {
      await updateRecipient.mutateAsync({ id: editingRecipient.id, ...form });
    } else {
      await createRecipient.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteRecipient.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Distribution Recipients</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : recipients.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No recipients yet. Add your first recipient to get started.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.company_name}</TableCell>
                    <TableCell>{recipient.contact_name}</TableCell>
                    <TableCell className="text-muted-foreground">{recipient.title || "—"}</TableCell>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(recipient)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(recipient.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecipient ? "Edit Recipient" : "Add Recipient"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRecipient.isPending || updateRecipient.isPending}>
                  {editingRecipient ? "Save Changes" : "Add Recipient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recipient?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this recipient and all associated send records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
