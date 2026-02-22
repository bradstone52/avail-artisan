import { Button } from '@/components/ui/button';
import { AlignJustify, AlignCenter } from 'lucide-react';
import type { TableDensity } from '@/hooks/useTableDensity';

interface DensityToggleProps {
  density: TableDensity;
  toggle: () => void;
}

export function DensityToggle({ density, toggle }: DensityToggleProps) {
  return (
    <Button variant="outline" size="sm" onClick={toggle} title={density === 'compact' ? 'Switch to comfortable' : 'Switch to compact'}>
      {density === 'compact' ? <AlignJustify className="w-4 h-4 mr-1.5" /> : <AlignCenter className="w-4 h-4 mr-1.5" />}
      {density === 'compact' ? 'Compact' : 'Comfortable'}
    </Button>
  );
}
