/**
 * useBrochureState.ts
 *
 * Manages all brochure UI state for a single listing:
 *  - AI-generated marketing content
 *  - manual overrides (persisted to localStorage)
 *  - map zoom / offset
 *  - UI flags (generating, downloading, editing)
 *
 * PERSISTENCE:
 * Overrides are stored in localStorage under the key `brochure_overrides_<listingId>`.
 * This survives page refreshes without a DB migration.
 * When you're ready to make overrides team-shareable, the shape is already a clean JSONB
 * blob — just POST it to a `brochure_overrides` table and read it back here.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  BrochureMarketingContent,
  BrochureOverrides,
  BrochureSourceListing,
} from '@/lib/brochures/brochureTypes';

const localKey = (listingId: string) => `brochure_overrides_${listingId}`;

function loadOverrides(listingId: string): BrochureOverrides {
  try {
    const raw = localStorage.getItem(localKey(listingId));
    if (raw) return JSON.parse(raw) as BrochureOverrides;
  } catch { /* ignore */ }
  return {};
}

function saveOverrides(listingId: string, overrides: BrochureOverrides) {
  try {
    localStorage.setItem(localKey(listingId), JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export interface UseBrochureStateResult {
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
}

export function useBrochureState(listing: Pick<BrochureSourceListing, 'id'>): UseBrochureStateResult {
  const [marketing, setMarketing]               = useState<BrochureMarketingContent | null>(null);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [overrides, setOverrides]               = useState<BrochureOverrides>(() => loadOverrides(listing.id));
  const [isEditing, setIsEditing]               = useState(false);
  const [includeConfidential, setIncludeConf]   = useState(false);
  const [mapZoom, setMapZoom]                   = useState(14);
  const [mapOffset, setMapOffset]               = useState({ lat: 0, lng: 0 });
  const [isDownloading, setIsDownloading]       = useState(false);

  // Persist overrides whenever they change
  useEffect(() => {
    saveOverrides(listing.id, overrides);
  }, [listing.id, overrides]);

  const generateMarketing = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-marketing', {
        body: { listing },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setMarketing(data as BrochureMarketingContent);
      toast.success('Marketing content generated!');
    } catch (err) {
      console.error('generate marketing error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate marketing content');
    } finally {
      setIsGenerating(false);
    }
  }, [listing]);

  const updateOverride = useCallback(
    <K extends keyof BrochureOverrides>(key: K, value: BrochureOverrides[K]) => {
      setOverrides(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetOverrides = useCallback(() => {
    setOverrides({});
    localStorage.removeItem(localKey(listing.id));
    toast.success('Overrides cleared');
  }, [listing.id]);

  const handleZoomIn  = () => setMapZoom(z => Math.min(z + 1, 20));
  const handleZoomOut = () => setMapZoom(z => Math.max(z - 1, 10));

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const pan = 0.005 * Math.pow(2, 14 - mapZoom);
    setMapOffset(prev => {
      switch (direction) {
        case 'up':    return { ...prev, lat: prev.lat + pan };
        case 'down':  return { ...prev, lat: prev.lat - pan };
        case 'left':  return { ...prev, lng: prev.lng - pan };
        case 'right': return { ...prev, lng: prev.lng + pan };
      }
    });
  };

  const handleResetMap = () => {
    setMapZoom(14);
    setMapOffset({ lat: 0, lng: 0 });
  };

  return {
    marketing,
    isGenerating,
    generateMarketing,
    overrides,
    updateOverride,
    resetOverrides,
    isEditing,
    setIsEditing,
    includeConfidential,
    setIncludeConfidential: setIncludeConf,
    mapZoom,
    mapOffset,
    handleZoomIn,
    handleZoomOut,
    handlePan,
    handleResetMap,
    isDownloading,
    setIsDownloading,
  };
}
