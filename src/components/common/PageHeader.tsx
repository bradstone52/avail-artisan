import { ReactNode } from 'react';
import { LucideIcon, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backLink?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  backLink,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {backLink && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backLink)}
            className="shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-7 h-7 text-primary shrink-0" />}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
