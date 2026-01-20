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
} from '@/components/ui/select';
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

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === listing.status) return;

    // If changing to "Sold/Leased" status, go directly to Log Transaction
    if (newStatus === 'Sold/Leased') {
      // Navigate directly to transaction form - listing will be deleted after transaction is created
      navigate(`/transactions/new?listing=${listing.id}`);
      return;
    }

    await updateStatus(newStatus);
  };

  const updateStatus = async (newStatus: string) => {
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
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
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

    </>
  );
}
