import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Filter,
  Shuffle,
  XCircle,
} from 'lucide-react';

interface StagingRecord {
  id: string;
  extracted_data: unknown;
  matched_listing_id: string | null;
  match_confidence: number | null;
  import_action: string | null;
}

interface QAStats {
  total: number;
  bySubmarket: Record<string, number>;
  withMatches: number;
  newRecords: number;
  missingAddress: number;
  missingSize: number;
  missingCity: number;
  lowConfidence: number;
  highConfidence: number;
  submarkets: string[];
}

interface ExtractionQASummaryProps {
  stagingRecords: StagingRecord[];
  expectedCount?: number;
  onFilterChange: (filters: QAFilters) => void;
  onSpotCheck: (sampleSize: number) => void;
  activeFilters: QAFilters;
}

export interface QAFilters {
  showOnlyNew: boolean;
  showOnlyMatched: boolean;
  showMissingFields: boolean;
  showLowConfidence: boolean;
  submarketFilter: string | null;
  spotCheckIds: string[];
}

export function computeQAStats(stagingRecords: StagingRecord[]): QAStats {
  const bySubmarket: Record<string, number> = {};
  let missingAddress = 0;
  let missingSize = 0;
  let missingCity = 0;
  let lowConfidence = 0;
  let highConfidence = 0;
  let withMatches = 0;
  let newRecords = 0;

  for (const record of stagingRecords) {
    const data = record.extracted_data as Record<string, unknown>;
    const submarket = (data.submarket as string) || 'Unknown';
    bySubmarket[submarket] = (bySubmarket[submarket] || 0) + 1;

    if (!data.address) missingAddress++;
    if (!data.size_sf) missingSize++;
    if (!data.city) missingCity++;

    if (record.matched_listing_id) {
      withMatches++;
      if ((record.match_confidence || 0) >= 0.9) {
        highConfidence++;
      } else if ((record.match_confidence || 0) < 0.8) {
        lowConfidence++;
      }
    } else {
      newRecords++;
    }
  }

  return {
    total: stagingRecords.length,
    bySubmarket,
    withMatches,
    newRecords,
    missingAddress,
    missingSize,
    missingCity,
    lowConfidence,
    highConfidence,
    submarkets: Object.keys(bySubmarket).sort(),
  };
}

export function ExtractionQASummary({
  stagingRecords,
  expectedCount,
  onFilterChange,
  onSpotCheck,
  activeFilters,
}: ExtractionQASummaryProps) {
  const stats = useMemo(() => computeQAStats(stagingRecords), [stagingRecords]);

  const [localFilters, setLocalFilters] = useState<QAFilters>(activeFilters);

  const updateFilter = <K extends keyof QAFilters>(key: K, value: QAFilters[K]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const cleared: QAFilters = {
      showOnlyNew: false,
      showOnlyMatched: false,
      showMissingFields: false,
      showLowConfidence: false,
      submarketFilter: null,
      spotCheckIds: [],
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters =
    localFilters.showOnlyNew ||
    localFilters.showOnlyMatched ||
    localFilters.showMissingFields ||
    localFilters.showLowConfidence ||
    localFilters.submarketFilter !== null ||
    localFilters.spotCheckIds.length > 0;

  const countDiff = expectedCount ? expectedCount - stats.total : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Extraction QA Summary
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Count Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Extracted</div>
            {countDiff !== null && countDiff !== 0 && (
              <Badge variant={countDiff > 0 ? 'destructive' : 'default'} className="mt-1">
                {countDiff > 0 ? `-${countDiff} missing` : `+${Math.abs(countDiff)} extra`}
              </Badge>
            )}
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-600">{stats.withMatches}</div>
            <div className="text-xs text-muted-foreground">Matched</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-blue-600">{stats.newRecords}</div>
            <div className="text-xs text-muted-foreground">New Records</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-amber-600">{stats.lowConfidence}</div>
            <div className="text-xs text-muted-foreground">Low Confidence</div>
          </div>
        </div>

        {/* Data Quality Flags */}
        {(stats.missingAddress > 0 || stats.missingSize > 0 || stats.missingCity > 0) && (
          <div className="flex flex-wrap gap-2">
            {stats.missingAddress > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {stats.missingAddress} missing address
              </Badge>
            )}
            {stats.missingSize > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {stats.missingSize} missing size
              </Badge>
            )}
            {stats.missingCity > 0 && (
              <Badge variant="outline" className="gap-1">
                {stats.missingCity} missing city
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Submarket Breakdown */}
        <div>
          <div className="text-sm font-medium mb-2">By Submarket</div>
          <div className="flex flex-wrap gap-1">
            {stats.submarkets.map((sub) => (
              <Button
                key={sub}
                variant={localFilters.submarketFilter === sub ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  updateFilter(
                    'submarketFilter',
                    localFilters.submarketFilter === sub ? null : sub
                  )
                }
              >
                {sub} ({stats.bySubmarket[sub]})
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Smart Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-new"
              checked={localFilters.showOnlyNew}
              onCheckedChange={(checked) => updateFilter('showOnlyNew', !!checked)}
            />
            <Label htmlFor="filter-new" className="text-sm cursor-pointer">
              New only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-matched"
              checked={localFilters.showOnlyMatched}
              onCheckedChange={(checked) => updateFilter('showOnlyMatched', !!checked)}
            />
            <Label htmlFor="filter-matched" className="text-sm cursor-pointer">
              Matched only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-missing"
              checked={localFilters.showMissingFields}
              onCheckedChange={(checked) => updateFilter('showMissingFields', !!checked)}
            />
            <Label htmlFor="filter-missing" className="text-sm cursor-pointer">
              Missing fields
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-lowconf"
              checked={localFilters.showLowConfidence}
              onCheckedChange={(checked) => updateFilter('showLowConfidence', !!checked)}
            />
            <Label htmlFor="filter-lowconf" className="text-sm cursor-pointer">
              Low confidence
            </Label>
          </div>
        </div>

        {/* Spot-Check Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSpotCheck(10)}
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            Spot-Check 10
          </Button>
          {localFilters.spotCheckIds.length > 0 && (
            <Badge variant="secondary">
              Showing {localFilters.spotCheckIds.length} samples
            </Badge>
          )}
        </div>

        {/* Expected vs Actual Explanation */}
        {expectedCount && countDiff !== null && countDiff > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <span className="font-medium">
                  Expected {expectedCount} listings, extracted {stats.total}
                </span>
                <p className="text-muted-foreground mt-1">
                  The AI may have skipped listings marked as "Leased!" or "Sold!" with
                  watermarks. This is expected behavior—only active listings are extracted.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
