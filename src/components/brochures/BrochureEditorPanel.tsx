/**
 * BrochureEditorPanel.tsx
 *
 * Phase 2 brochure editor sidebar.
 * Lets the broker configure all override fields before generating the PDF:
 *  - template selector
 *  - section visibility toggles
 *  - hero photo picker
 *  - gallery ordering
 *  - editable headline / tagline / description / highlights
 *  - location paragraph (stored in overrides.locationParagraph)
 *  - custom disclaimer
 *  - include confidential toggle
 *  - save button → persists to brochure_states via useBrochurePersistence
 */
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Save, RotateCcw, GripVertical, Star, StarOff, Eye, EyeOff,
  Layers, Image as ImageIcon, FileText, LayoutTemplate,
} from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import type { BrochurePersistedState } from '@/hooks/useBrochurePersistence';
import type { BrochurePhoto } from '@/lib/brochures/brochureTypes';

interface BrochureEditorPanelProps {
  state: BrochurePersistedState;
  photos: BrochurePhoto[];       // all gallery photos from internal_listing_photos
  heroPhotoUrl: string | null;   // listing.photo_url fallback
  isSaving: boolean;
  onUpdate: (patch: Partial<BrochurePersistedState>) => void;
  onSave: () => Promise<void>;
  onResetOverrides: () => void;
}

const TEMPLATE_OPTIONS = [
  { value: 'industrial-standard', label: 'Industrial Standard' },
  { value: 'industrial-lease',    label: 'Industrial Lease (coming soon)',    disabled: true },
  { value: 'industrial-sale',     label: 'Industrial Sale (coming soon)',     disabled: true },
  { value: 'industrial-both',     label: 'Sale / Lease (coming soon)',        disabled: true },
] as const;

const SECTION_LABELS: Record<string, string> = {
  cover:       'Cover / Hero',
  tagline:     'Tagline',
  description: 'Description',
  highlights:  'Key Highlights',
  specs:       'Specifications Table',
  pricing:     'Pricing Card',
  map:         'Location Map',
  gallery:     'Photo Gallery',
  brokerNotes: 'Broker Notes (Confidential)',
  footer:      'Footer / Disclaimer',
};

export function BrochureEditorPanel({
  state,
  photos,
  heroPhotoUrl,
  isSaving,
  onUpdate,
  onSave,
  onResetOverrides,
}: BrochureEditorPanelProps) {
  const [localHighlights, setLocalHighlights] = useState(
    (state.overrides.highlights ?? []).join('\n')
  );

  // ── Visibility helpers ──────────────────────────────────────────────────────
  const vis = state.overrides.visibility ?? {};
  const toggleSection = (key: string, value: boolean) => {
    onUpdate({ overrides: { ...state.overrides, visibility: { ...vis, [key]: value } } });
  };

  // ── Gallery ordering ────────────────────────────────────────────────────────
  const orderedIds: string[] = state.galleryPhotoIds.length
    ? state.galleryPhotoIds
    : photos.map(p => p.id);

  const orderedPhotos = orderedIds
    .map(id => photos.find(p => p.id === id))
    .filter((p): p is BrochurePhoto => !!p);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(orderedIds);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onUpdate({ galleryPhotoIds: reordered });
  };

  const setHero = (photoId: string, photoUrl: string) => {
    onUpdate({
      heroPhotoId: state.heroPhotoId === photoId ? null : photoId,
      heroPhotoUrl: state.heroPhotoId === photoId ? null : photoUrl,
      overrides: {
        ...state.overrides,
        heroPhotoId: state.heroPhotoId === photoId ? null : photoId,
      },
    });
  };

  // ── Highlights sync ─────────────────────────────────────────────────────────
  const commitHighlights = (raw: string) => {
    setLocalHighlights(raw);
    const lines = raw.split('\n').filter(l => l.trim());
    onUpdate({ overrides: { ...state.overrides, highlights: lines } });
  };

  return (
    <div className="space-y-4">
      {/* Save / Reset toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Brochure Editor</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onResetOverrides} title="Reset all overrides">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['template', 'photos', 'copy', 'visibility']} className="space-y-2">

        {/* ── Template ─────────────────────────────────────────────────────── */}
        <AccordionItem value="template" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              Template
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Select
              value={state.templateKey}
              onValueChange={(v) => onUpdate({ templateKey: v as BrochurePersistedState['templateKey'] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value} disabled={(t as any).disabled}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* ── Hero Photo Picker ─────────────────────────────────────────────── */}
        <AccordionItem value="photos" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Hero Photo &amp; Gallery Order
              {orderedPhotos.length > 0 && (
                <Badge variant="secondary" className="ml-1">{orderedPhotos.length}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {/* Current hero preview */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Active Hero Photo</Label>
              {(state.heroPhotoUrl ?? heroPhotoUrl) ? (
                <AspectRatio ratio={16 / 9} className="overflow-hidden rounded border border-border">
                  <img
                    src={state.heroPhotoUrl ?? heroPhotoUrl!}
                    alt="Hero"
                    className="object-cover w-full h-full"
                  />
                </AspectRatio>
              ) : (
                <div className="h-20 rounded border border-dashed border-border flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No hero photo set</p>
                </div>
              )}
              {state.heroPhotoId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onUpdate({ heroPhotoId: null, heroPhotoUrl: null, overrides: { ...state.overrides, heroPhotoId: null } })}
                >
                  Use default listing photo
                </Button>
              )}
            </div>

            {photos.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Pick hero • drag to reorder gallery
                </Label>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="gallery">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2"
                      >
                        {orderedPhotos.map((photo, index) => {
                          const isHero = state.heroPhotoId === photo.id;
                          return (
                            <Draggable key={photo.id} draggableId={photo.id} index={index}>
                              {(drag) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-default ${
                                    isHero
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-muted-foreground/40'
                                  }`}
                                >
                                  <div {...drag.dragHandleProps} className="p-0.5 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="w-14 h-10 rounded overflow-hidden flex-shrink-0">
                                    <img
                                      src={photo.photo_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate flex-1">
                                    {photo.caption ?? `Photo ${index + 1}`}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0"
                                    title={isHero ? 'Remove as hero' : 'Set as hero'}
                                    onClick={() => setHero(photo.id, photo.photo_url)}
                                  >
                                    {isHero
                                      ? <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                                      : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    }
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Copy Overrides ────────────────────────────────────────────────── */}
        <AccordionItem value="copy" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Marketing Copy
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Headline</Label>
              <Input
                value={state.overrides.headline ?? state.marketing?.headline ?? ''}
                onChange={(e) => onUpdate({ overrides: { ...state.overrides, headline: e.target.value } })}
                placeholder="Auto-generated headline"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tagline</Label>
              <Input
                value={state.overrides.tagline ?? state.marketing?.tagline ?? ''}
                onChange={(e) => onUpdate({ overrides: { ...state.overrides, tagline: e.target.value } })}
                placeholder="Auto-generated tagline"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={state.overrides.description ?? state.marketing?.description ?? ''}
                onChange={(e) => onUpdate({ overrides: { ...state.overrides, description: e.target.value } })}
                rows={5}
                placeholder="Property description…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Key Highlights (one per line)</Label>
              <Textarea
                value={localHighlights || (state.overrides.highlights ?? state.marketing?.highlights ?? []).join('\n')}
                onChange={(e) => commitHighlights(e.target.value)}
                rows={6}
                placeholder="One highlight per line"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Location Paragraph (optional)</Label>
              <Textarea
                value={(state.overrides as any).locationParagraph ?? ''}
                onChange={(e) =>
                  onUpdate({ overrides: { ...state.overrides, ...(e.target.value ? { locationParagraph: e.target.value } : {}) } })
                }
                rows={3}
                placeholder="Custom location description for the map page…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Custom Disclaimer</Label>
              <Textarea
                value={state.overrides.disclaimer ?? ''}
                onChange={(e) => onUpdate({ overrides: { ...state.overrides, disclaimer: e.target.value || undefined } })}
                rows={4}
                placeholder="Leave blank to use the default disclaimer"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Section Visibility ────────────────────────────────────────────── */}
        <AccordionItem value="visibility" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Show / Hide Sections
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {Object.entries(SECTION_LABELS).map(([key, label]) => {
              const defaultOn = key !== 'brokerNotes';
              const isOn = vis[key as keyof typeof vis] ?? defaultOn;
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOn
                      ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                    }
                    <Label className={`text-sm cursor-pointer ${!isOn ? 'text-muted-foreground' : ''}`}>
                      {label}
                    </Label>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(v) => toggleSection(key, v)}
                  />
                </div>
              );
            })}
            {/* Broker notes toggle also drives includeConfidential */}
            <p className="text-xs text-muted-foreground pt-1">
              Broker Notes are always hidden from public prints unless explicitly enabled.
            </p>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
