import { IssueSettings } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { UserPlus, Building2 } from 'lucide-react';
import { CoverImageUpload } from './CoverImageUpload';

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

        <div className="space-y-2">
          <Label htmlFor="market">Market</Label>
          <Input
            id="market"
            placeholder="Calgary Region"
            value={settings.market}
            onChange={(e) => updateField('market', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="threshold">Minimum SF</Label>
            <Input
              id="threshold"
              type="number"
              placeholder="100000"
              value={settings.sizeThreshold || ''}
              onChange={(e) => updateField('sizeThreshold', parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Properties must be at least this size
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thresholdMax">Maximum SF</Label>
            <Input
              id="thresholdMax"
              type="number"
              placeholder="500000"
              value={settings.sizeThresholdMax || ''}
              onChange={(e) => updateField('sizeThresholdMax', parseInt(e.target.value) || 500000)}
            />
            <p className="text-xs text-muted-foreground">
              Properties must be at most this size
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

        {/* Cover Image Upload */}
        <CoverImageUpload
          value={settings.coverImageUrl}
          onChange={(url) => updateField('coverImageUrl', url)}
        />
      </div>

      {/* Branding */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Branding</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...settings,
                brokerageName: 'ClearView Commercial Realty Inc.',
                logoUrl: 'https://static.wixstatic.com/media/61f242_c5db9313e4e7406b98b65af86d332a61~mv2.png/v1/fill/w_734,h_128,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Clearview_CRI_Logo_HORZ_FC_KO_CMYK_edited.png',
              });
            }}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Use Defaults
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brokerageName">Brokerage Name</Label>
            <Input
              id="brokerageName"
              placeholder="ClearView Commercial Realty Inc."
              value={settings.brokerageName}
              onChange={(e) => updateField('brokerageName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
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

      {/* Contacts */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Contacts</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...settings,
                primaryContactName: 'Brad Stone',
                primaryContactTitle: 'Partner, Associate Broker',
                primaryContactEmail: 'brad@cvpartners.ca',
                primaryContactPhone: '(403) 613-2898',
                secondaryContactName: 'Doug Johannson',
                secondaryContactTitle: 'Partner, Senior Vice President',
                secondaryContactEmail: 'doug@cvpartners.ca',
                secondaryContactPhone: '(403) 470-8875',
              });
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Use Defaults
          </Button>
        </div>

        {/* Primary Contact */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Primary Contact</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryContactName">Name</Label>
              <Input
                id="primaryContactName"
                placeholder="Brad Stone"
                value={settings.primaryContactName}
                onChange={(e) => updateField('primaryContactName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactTitle">Title</Label>
              <Input
                id="primaryContactTitle"
                placeholder="Partner, Associate Broker"
                value={settings.primaryContactTitle}
                onChange={(e) => updateField('primaryContactTitle', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactEmail">Email</Label>
              <Input
                id="primaryContactEmail"
                type="email"
                placeholder="brad@cvpartners.ca"
                value={settings.primaryContactEmail}
                onChange={(e) => updateField('primaryContactEmail', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactPhone">Phone</Label>
              <Input
                id="primaryContactPhone"
                type="tel"
                placeholder="(403) 613-2898"
                value={settings.primaryContactPhone}
                onChange={(e) => updateField('primaryContactPhone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Secondary Contact */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Secondary Contact (optional)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="secondaryContactName">Name</Label>
              <Input
                id="secondaryContactName"
                placeholder="Doug Johannson"
                value={settings.secondaryContactName}
                onChange={(e) => updateField('secondaryContactName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryContactTitle">Title</Label>
              <Input
                id="secondaryContactTitle"
                placeholder="Partner, Senior Vice President"
                value={settings.secondaryContactTitle}
                onChange={(e) => updateField('secondaryContactTitle', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryContactEmail">Email</Label>
              <Input
                id="secondaryContactEmail"
                type="email"
                placeholder="doug@cvpartners.ca"
                value={settings.secondaryContactEmail}
                onChange={(e) => updateField('secondaryContactEmail', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryContactPhone">Phone</Label>
              <Input
                id="secondaryContactPhone"
                type="tel"
                placeholder="(403) 470-8875"
                value={settings.secondaryContactPhone}
                onChange={(e) => updateField('secondaryContactPhone', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
