import { Check, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
}

export function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">Getting Started</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {items.length} steps completed
          </p>
        </div>
        <div className="text-2xl font-display font-bold text-primary">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-4 p-3 rounded-lg transition-colors",
              item.completed ? "bg-success/5" : "bg-muted/50 hover:bg-muted"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
              item.completed 
                ? "bg-success text-success-foreground" 
                : "bg-border text-muted-foreground"
            )}>
              {item.completed ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs font-medium">{index + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                item.completed && "text-muted-foreground line-through"
              )}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
            {!item.completed && item.action && (
              <button
                onClick={item.action}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {item.actionLabel || 'Start'}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
