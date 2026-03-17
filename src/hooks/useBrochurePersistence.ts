/**
 * useBrochurePersistence.ts
 *
 * Handles loading and saving brochure state to the `brochure_states` table.
 * Replaces the localStorage-only approach from Phase 1.
 *
 * On mount: load from DB → fall back to localStorage (migration path)
 * On save:  upsert to DB + mirror to localStorage as backup
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  BrochureMarketingContent,
  BrochureOverrides,
  BrochureTemplateKey,
} from '@/lib/brochures/brochureTypes';

export interface BrochurePersistedState {
  templateKey: BrochureTemplateKey;
  marketing: BrochureMarketingContent | null;
  overrides: BrochureOverrides;
  heroPhotoId: string | null;
  heroPhotoUrl: string | null;
  galleryPhotoIds: string[];
  includeConfidential: boolean;
  mapZoom: number;
  mapOffsetLat: number;
  mapOffsetLng: number;
}

const DEFAULT_STATE: BrochurePersistedState = {
  templateKey: 'industrial-standard',
  marketing: null,
  overrides: {},
  heroPhotoId: null,
  heroPhotoUrl: null,
  galleryPhotoIds: [],
  includeConfidential: false,
  mapZoom: 14,
  mapOffsetLat: 0,
  mapOffsetLng: 0,
};

const localKey = (listingId: string) => `brochure_overrides_${listingId}`;

/** Migrate any existing localStorage overrides into the initial state. */
function readLocalOverrides(listingId: string): Partial<BrochurePersistedState> {
  try {
    const raw = localStorage.getItem(localKey(listingId));
    if (raw) {
      const parsed = JSON.parse(raw) as BrochureOverrides;
      return { overrides: parsed };
    }
  } catch { /* ignore */ }
  return {};
}

export interface UseBrochurePersistenceResult {
  state: BrochurePersistedState;
  isLoading: boolean;
  isSaving: boolean;
  updateState: (patch: Partial<BrochurePersistedState>) => void;
  saveState: () => Promise<void>;
}

export function useBrochurePersistence(listingId: string): UseBrochurePersistenceResult {
  const [state, setState] = useState<BrochurePersistedState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Track pending changes so save always uses latest
  const [dirty, setDirty] = useState(false);

  // ── Load from DB on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('brochure_states')
          .select('*')
          .eq('listing_id', listingId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Row exists — hydrate state from DB
          setState({
            templateKey: (data.template_key as BrochureTemplateKey) ?? 'industrial-standard',
            marketing: data.marketing_json ?? null,
            overrides: data.overrides_json ?? {},
            heroPhotoId: data.hero_photo_id ?? null,
            heroPhotoUrl: data.hero_photo_url ?? null,
            galleryPhotoIds: Array.isArray(data.gallery_photo_ids) ? data.gallery_photo_ids : [],
            includeConfidential: data.include_confidential ?? false,
            mapZoom: data.map_zoom ?? 14,
            mapOffsetLat: data.map_offset_lat ?? 0,
            mapOffsetLng: data.map_offset_lng ?? 0,
          });
        } else {
          // No row yet — check localStorage for legacy overrides migration
          const localFallback = readLocalOverrides(listingId);
          if (active) setState(prev => ({ ...prev, ...localFallback }));
        }
      } catch (err) {
        console.error('Failed to load brochure state:', err);
        // Fall back to localStorage on any error
        const localFallback = readLocalOverrides(listingId);
        if (active) setState(prev => ({ ...prev, ...localFallback }));
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => { active = false; };
  }, [listingId]);

  // ── Patch state (in memory) ─────────────────────────────────────────────────
  const updateState = useCallback((patch: Partial<BrochurePersistedState>) => {
    setState(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  // ── Persist to DB ────────────────────────────────────────────────────────────
  const saveState = useCallback(async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Read latest state via functional update to avoid closure staleness
      let latestState!: BrochurePersistedState;
      setState(s => { latestState = s; return s; });

      const row = {
        listing_id: listingId,
        template_key: latestState.templateKey,
        marketing_json: latestState.marketing,
        overrides_json: latestState.overrides,
        hero_photo_id: latestState.heroPhotoId,
        hero_photo_url: latestState.heroPhotoUrl,
        gallery_photo_ids: latestState.galleryPhotoIds,
        include_confidential: latestState.includeConfidential,
        map_zoom: latestState.mapZoom,
        map_offset_lat: latestState.mapOffsetLat,
        map_offset_lng: latestState.mapOffsetLng,
        updated_by: user?.id ?? null,
      };

      const { error } = await (supabase as any)
        .from('brochure_states')
        .upsert(row, { onConflict: 'listing_id' });

      if (error) throw error;

      // Also mirror overrides to localStorage as a fast-cache backup
      try {
        localStorage.setItem(localKey(listingId), JSON.stringify(latestState.overrides));
      } catch { /* ignore */ }

      setDirty(false);
      toast.success('Brochure saved');
    } catch (err) {
      console.error('Failed to save brochure state:', err);
      toast.error('Failed to save brochure');
    } finally {
      setIsSaving(false);
    }
  }, [listingId]);

  return { state, isLoading, isSaving, updateState, saveState };
}
