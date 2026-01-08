import { IssueSettings } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

interface IssueSettingsStepProps {
  settings: IssueSettings;
  onChange: (settings: IssueSettings) => void;
}

export function IssueSettingsStep({ settings, onChange }: IssueSettingsStepProps) {
  const defaultTitle = `Large-Format Distribution Availability — ${format(new Date(), 'MMMM yyyy')}`;

  const updateField = <K extends keyof IssueSettings>(
    field: K, 
    value: IssueSettings[K]
  ) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Issue Settings</h2>
        <p className="text-muted-foreground text-sm">
          Configure the basic details for this distribution snapshot
        </p>
      </div>

      {/* Issue Details */}
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Issue Title</Label>
          <Input
            id="title"
            placeholder={defaultTitle}
            value={settings.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use default: "{defaultTitle}"
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="market">Market</Label>
            <Input
              id="market"
              placeholder="Calgary Region"
              value={settings.market}
              onChange={(e) => updateField('market', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Size Threshold (SF)</Label>
            <Input
              id="threshold"
              type="number"
              placeholder="100000"
              value={settings.sizeThreshold || ''}
              onChange={(e) => updateField('sizeThreshold', parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Only include properties above this size
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Select
            value={settings.sortOrder}
            onValueChange={(value) => updateField('sortOrder', value as IssueSettings['sortOrder'])}
          >
            <SelectTrigger id="sortOrder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="size_desc">Size (largest first)</SelectItem>
              <SelectItem value="size_asc">Size (smallest first)</SelectItem>
              <SelectItem value="availability_asc">Availability (soonest first)</SelectItem>
              <SelectItem value="availability_desc">Availability (latest first)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Branding */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-display font-semibold mb-4">Branding</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="brokerageName">Brokerage Name</Label>
            <Input
              id="brokerageName"
              placeholder="Your Brokerage Inc."
              value={settings.brokerageName}
              onChange={(e) => updateField('brokerageName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (optional)</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              value={settings.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-display font-semibold mb-4">Primary Contact</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="contactName">Name</Label>
            <Input
              id="contactName"
              placeholder="John Smith"
              value={settings.primaryContactName}
              onChange={(e) => updateField('primaryContactName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="john@brokerage.com"
              value={settings.primaryContactEmail}
              onChange={(e) => updateField('primaryContactEmail', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="(403) 555-1234"
              value={settings.primaryContactPhone}
              onChange={(e) => updateField('primaryContactPhone', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
