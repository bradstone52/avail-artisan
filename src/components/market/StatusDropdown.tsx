import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'bg-blue-600 text-white' },
  { value: 'Under Contract', label: 'Under Contract', color: 'bg-amber-500 text-white' },
  { value: 'Sold/Leased', label: 'Sold/Leased', color: 'bg-red-600 text-white' },
  { value: 'Unknown/Removed', label: 'Unknown/Removed', color: 'bg-gray-300 text-gray-600' },
];

interface StatusDropdownProps {
  listing: MarketListing;
  onStatusChanged: () => void;
}

export function StatusDropdown({ listing, onStatusChanged }: StatusDropdownProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTransactionPrompt, setShowTransactionPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === listing.status) return;

    // Check if changing to "Sold/Leased" status
    const wasOpen = listing.status !== 'Sold/Leased';
    const isNowClosed = newStatus === 'Sold/Leased';

    if (wasOpen && isNowClosed) {
      setPendingStatus(newStatus);
      setShowTransactionPrompt(true);
      return;
    }

    await updateStatus(newStatus);
  };

  const updateStatus = async (newStatus: string, createTransaction = false) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast.success(`Status updated to ${newStatus}`);
      onStatusChanged();

      if (createTransaction) {
        navigate(`/transactions/new?listing=${listing.id}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (pendingStatus) {
      await updateStatus(pendingStatus, true);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const handleSkipTransaction = async () => {
    if (pendingStatus) {
      await updateStatus(pendingStatus, false);
    }
    setShowTransactionPrompt(false);
    setPendingStatus(null);
  };

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === listing.status);

  return (
    <>
      <Select value={listing.status} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Badge className={`${currentOption?.color || 'bg-gray-300 text-gray-600'} text-xs px-2 py-0`}>
              {currentOption?.label || listing.status}
            </Badge>
          )}
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <Badge className={`${opt.color} text-xs px-2 py-0`}>
                {opt.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={showTransactionPrompt} onOpenChange={setShowTransactionPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Transaction Record?</AlertDialogTitle>
            <AlertDialogDescription>
              You're marking this listing as "{pendingStatus}". Would you like to create a transaction 
              record to capture the deal details (price, buyer/tenant, closing date, etc.)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipTransaction}>
              Skip for Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransaction}>
              Yes, Create Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
