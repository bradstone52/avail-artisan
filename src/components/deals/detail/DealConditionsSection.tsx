import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileCheck, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { DealCondition } from '@/hooks/useDealConditions';

interface DealConditionsSectionProps {
  conditions: DealCondition[];
  onAdd: (condition: { description: string; due_date?: string }) => Promise<void>;
  onUpdate: (id: string, updates: Partial<DealCondition>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DealConditionsSection({ 
  conditions, 
  onAdd, 
  onUpdate, 
  onDelete 
}: DealConditionsSectionProps) {
  const [newCondition, setNewCondition] = useState({ description: '', due_date: '' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newCondition.description) return;
    setAdding(true);
    try {
      await onAdd({
        description: newCondition.description,
        due_date: newCondition.due_date || undefined,
      });
      setNewCondition({ description: '', due_date: '' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          Key Conditions & Removal Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing conditions */}
        {conditions.length > 0 && (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div 
                key={condition.id} 
                className="flex items-start gap-3 p-3 border rounded-md bg-muted/30"
              >
                <Checkbox
                  checked={condition.is_satisfied}
                  onCheckedChange={(checked) => 
                    onUpdate(condition.id, { is_satisfied: !!checked })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={condition.is_satisfied ? 'line-through text-muted-foreground' : ''}>
                    {index + 1}. {condition.description}
                  </p>
                  {condition.due_date && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Removal by {format(new Date(condition.due_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(condition.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new condition */}
        <div className="flex gap-3 items-end p-3 border-2 border-dashed rounded-md">
          <div className="flex-1 space-y-2">
            <Label>Description</Label>
            <Input
              value={newCondition.description}
              onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
              placeholder="Enter condition description..."
            />
          </div>
          <div className="w-48 space-y-2">
            <Label>Removal Date</Label>
            <Input
              type="date"
              value={newCondition.due_date}
              onChange={(e) => setNewCondition({ ...newCondition, due_date: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newCondition.description}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {conditions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No conditions added yet. Use the form above to add conditions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
