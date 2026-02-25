import { useState } from 'react';
import { Copy, Check, Linkedin, BookmarkPlus, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ContactResult } from '@/hooks/useContactFinder';

interface ContactResultCardProps {
  contact: ContactResult;
  onSave: (contact: ContactResult) => void;
  isSaving?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function ContactResultCard({ contact, onSave, isSaving }: ContactResultCardProps) {
  return (
    <div
      className="border-2 border-foreground/20 hover:border-foreground bg-card p-4 space-y-3 transition-all"
      style={{ borderRadius: 'var(--radius)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate">{contact.name ?? '—'}</p>
          {contact.title && <p className="text-sm text-muted-foreground truncate">{contact.title}</p>}
          {contact.company && (
            <Badge variant="outline" className="mt-1 text-xs font-medium">{contact.company}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSave(contact)}
          disabled={isSaving}
          className="shrink-0 border-2 border-foreground font-bold text-xs"
        >
          <BookmarkPlus className="w-3 h-3 mr-1" />
          Save Idea
        </Button>
      </div>

      {contact.emails.length > 0 && (
        <div className="space-y-1">
          {contact.emails.map((email) => (
            <div key={email} className="flex items-center gap-1 text-sm">
              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{email}</span>
              <CopyButton text={email} />
            </div>
          ))}
        </div>
      )}

      {contact.phones.length > 0 && (
        <div className="space-y-1">
          {contact.phones.map((phone) => (
            <div key={phone} className="flex items-center gap-1 text-sm">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-foreground">{phone}</span>
              <CopyButton text={phone} />
            </div>
          ))}
        </div>
      )}

      {contact.linkedin_url && (
        <a
          href={contact.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Linkedin className="w-3 h-3" />
          LinkedIn Profile
        </a>
      )}

      {contact.emails.length === 0 && contact.phones.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No contact info found for this person.</p>
      )}
    </div>
  );
}
