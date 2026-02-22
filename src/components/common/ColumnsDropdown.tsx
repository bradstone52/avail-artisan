import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import type { ColumnDef } from '@/hooks/useTableColumnPrefs';

interface ColumnsDropdownProps {
  columns: ColumnDef[];
  isVisible: (id: string) => boolean;
  toggle: (id: string) => void;
  reset: () => void;
}

export function ColumnsDropdown({ columns, isVisible, toggle, reset }: ColumnsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="w-4 h-4 mr-1.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background z-50 w-48">
        {columns.map(col => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={isVisible(col.id)}
            onCheckedChange={() => toggle(col.id)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={reset} className="justify-center text-xs text-muted-foreground">
          Reset to defaults
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
