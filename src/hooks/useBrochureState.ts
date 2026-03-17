/**
 * useBrochureState.ts  (Phase 2 — backed by Supabase persistence)
 *
 * Thin adapter over useBrochurePersistence that exposes the same surface
 * as Phase 1 so MarketingSection doesn't need a full rewrite.
 *
 * New in Phase 2:
 *  - state loads from / saves to the `brochure_states` DB table
 *  - localStorage is used only as a backup / migration path
 *  - `saveState` persists the whole blob
 *  - map controls now stored in persisted state
 */

import { useCallback } from 'react';
import { useBrochurePersistence } from './useBrochurePersistence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  BrochureMarketingContent,
  BrochureOverrides,
  BrochureSourceListing,
} from '@/lib/brochures/brochureTypes';

export interface UseBrochureStateResult {
  // ── Loading ──
  isLoadingState: boolean;

  // ── Marketing content ──
  marketing: BrochureMarketingContent | null;
  isGenerating: boolean;
  generateMarketing: () => Promise<void>;

  // ── Overrides ──
  overrides: BrochureOverrides;
  updateOverride: <K extends keyof BrochureOverrides>(key: K, value: BrochureOverrides[K]) => void;
  resetOverrides: () => void;

  // ── Edit mode ──
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  // ── Confidential flag ──
  includeConfidential: boolean;
  setIncludeConfidential: (v: boolean) => void;

  // ── Map controls ──
  mapZoom: number;
  mapOffset: { lat: number; lng: number };
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handlePan: (dir: 'up' | 'down' | 'left' | 'right') => void;
  handleResetMap: () => void;

  // ── Download ──
  isDownloading: boolean;
  setIsDownloading: (v: boolean) => void;

  // ── Persistence ──
  isSaving: boolean;
  saveState: () => Promise<void>;
}

// isGenerating and isEditing/isDownloading remain local — not persisted
import { useState } from 'react';

export function useBrochureState(listing: Pick<BrochureSourceListing, 'id'>): UseBrochureStateResult {
  const persistence = useBrochurePersistence(listing.id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Generate marketing content ──────────────────────────────────────────────
  const generateMarketing = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-marketing', {
        body: { listing },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      // Store marketing content in persisted state
      persistence.updateState({ marketing: data as BrochureMarketingContent });
      toast.success('Marketing content generated!');
    } catch (err) {
      console.error('generate marketing error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate marketing content');
    } finally {
      setIsGenerating(false);
    }
  }, [listing, persistence]);

  // ── Override helpers ────────────────────────────────────────────────────────
  const updateOverride = useCallback(
    <K extends keyof BrochureOverrides>(key: K, value: BrochureOverrides[K]) => {
      persistence.updateState({
        overrides: { ...persistence.state.overrides, [key]: value },
      });
    },
    [persistence]
  );

  const resetOverrides = useCallback(() => {
    persistence.updateState({ overrides: {} });
    try { localStorage.removeItem(`brochure_overrides_${listing.id}`); } catch { /* ignore */ }
    toast.success('Overrides cleared');
  }, [listing.id, persistence]);

  // ── Map controls ────────────────────────────────────────────────────────────
  const handleZoomIn = () =>
    persistence.updateState({ mapZoom: Math.min(persistence.state.mapZoom + 1, 20) });
  const handleZoomOut = () =>
    persistence.updateState({ mapZoom: Math.max(persistence.state.mapZoom - 1, 10) });

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const { mapZoom, mapOffsetLat, mapOffsetLng } = persistence.state;
    const pan = 0.005 * Math.pow(2, 14 - mapZoom);
    let lat = mapOffsetLat;
    let lng = mapOffsetLng;
    if (direction === 'up')    lat += pan;
    if (direction === 'down')  lat -= pan;
    if (direction === 'left')  lng -= pan;
    if (direction === 'right') lng += pan;
    persistence.updateState({ mapOffsetLat: lat, mapOffsetLng: lng });
  };

  const handleResetMap = () =>
    persistence.updateState({ mapZoom: 14, mapOffsetLat: 0, mapOffsetLng: 0 });

  return {
    isLoadingState: persistence.isLoading,

    marketing:       persistence.state.marketing,
    isGenerating,
    generateMarketing,

    overrides:      persistence.state.overrides,
    updateOverride,
    resetOverrides,

    isEditing,
    setIsEditing,

    includeConfidential: persistence.state.includeConfidential,
    setIncludeConfidential: (v) => persistence.updateState({ includeConfidential: v }),

    mapZoom:     persistence.state.mapZoom,
    mapOffset:   { lat: persistence.state.mapOffsetLat, lng: persistence.state.mapOffsetLng },
    handleZoomIn,
    handleZoomOut,
    handlePan,
    handleResetMap,

    isDownloading,
    setIsDownloading,

    isSaving:  persistence.isSaving,
    saveState: persistence.saveState,
  };
}
