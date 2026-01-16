import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface WizardStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function WizardSteps({ steps, currentStep, onStepClick }: WizardStepsProps) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex items-center justify-between gap-4 lg:gap-8">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <li 
              key={step.id} 
              className={cn(
                "flex-1 relative min-w-0",
                index !== steps.length - 1 && "pr-4 lg:pr-6"
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-4 left-8 right-0 h-px",
                    isComplete ? "bg-primary/60" : "bg-border/50"
                  )}
                  aria-hidden="true"
                />
              )}

              <button
                onClick={() => onStepClick?.(index)}
                disabled={isPending}
                className={cn(
                  "group relative flex items-start w-full",
                  isPending ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                )}
              >
                <span className="flex-shrink-0 flex items-center h-8">
                  <span
                    className={cn(
                      "relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
                      isComplete && "bg-primary text-primary-foreground shadow-sm",
                      isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/15 shadow-sm",
                      isPending && "bg-muted/80 text-muted-foreground/70"
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                </span>
                <span className="ml-3 min-w-0 flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-medium leading-tight truncate",
                      isCurrent && "text-foreground",
                      isComplete && "text-foreground/80",
                      isPending && "text-muted-foreground/70"
                    )}
                  >
                    {step.title}
                  </span>
                  <span 
                    className={cn(
                      "text-[11px] leading-snug hidden sm:block truncate",
                      isCurrent ? "text-muted-foreground/80" : "text-muted-foreground/60"
                    )}
                  >
                    {step.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
