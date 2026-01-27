import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = 
  | 'Active' | 'Under Contract' | 'Closed' | 'Lost' | 'On Hold'
  | 'New' | 'Contacted' | 'Qualified' | 'Converted'
  | 'Sold/Leased' | 'Unknown/Removed';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  'Active': 'bg-green-100 text-green-800 border-green-300',
  'Under Contract': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Closed': 'bg-blue-100 text-blue-800 border-blue-300',
  'Lost': 'bg-red-100 text-red-800 border-red-300',
  'On Hold': 'bg-gray-100 text-gray-800 border-gray-300',
  'New': 'bg-purple-100 text-purple-800 border-purple-300',
  'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Qualified': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Converted': 'bg-green-100 text-green-800 border-green-300',
  'Sold/Leased': 'bg-blue-100 text-blue-800 border-blue-300',
  'Unknown/Removed': 'bg-gray-100 text-gray-800 border-gray-300',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status as StatusType] || 'bg-muted text-muted-foreground';
  
  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border', style, className)}
    >
      {status}
    </Badge>
  );
}
