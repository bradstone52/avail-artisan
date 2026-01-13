import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
  action?: ReactNode;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  variant = 'default',
  action
}: StatCardProps) {
  return (
    <div className={cn(
      "stat-card animate-fade-in",
      variant === 'primary' && "border-primary/20 bg-primary/5",
      variant === 'success' && "border-success/20 bg-success/5",
      variant === 'warning' && "border-warning/20 bg-warning/5",
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {action}
          </div>
          <p className="mt-2 text-3xl font-display font-bold tracking-tight">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className={cn(
              "mt-2 text-sm font-medium",
              trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend.value > 0 ? '+' : ''}{trend.value} {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-3 rounded-lg",
            variant === 'default' && "bg-muted",
            variant === 'primary' && "bg-primary/10 text-primary",
            variant === 'success' && "bg-success/10 text-success",
            variant === 'warning' && "bg-warning/10 text-warning",
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
