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
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { MatchedProperty } from '@/hooks/useDuplicateAddressCheck';

interface DuplicateAddressWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchedProperty: MatchedProperty | null;
  onUseExisting: () => void;
  onCreateAnyway: () => void;
}

export function DuplicateAddressWarning({
  open,
  onOpenChange,
  matchedProperty,
  onUseExisting,
  onCreateAnyway,
}: DuplicateAddressWarningProps) {
  if (!matchedProperty) return null;

  const sourceLabel = {
    property: 'property',
    market_listing: 'market listing',
    transaction: 'transaction',
  }[matchedProperty.source];

  const formatSize = (sf: number | null) => {
    if (!sf) return null;
    return sf.toLocaleString() + ' SF';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            Similar Property Found
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                An existing {sourceLabel} matches this address:
              </p>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {matchedProperty.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[matchedProperty.city, formatSize(matchedProperty.size_sf)]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                </div>
              </div>
              <p>
                Do you want to link this transaction to the existing record, or
                create a new entry?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={onCreateAnyway}>
            Create Anyway
          </Button>
          <AlertDialogAction onClick={onUseExisting}>
            Use Existing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
