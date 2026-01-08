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
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <li 
              key={step.id} 
              className={cn(
                "flex-1 relative",
                index !== steps.length - 1 && "pr-8"
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-4 left-8 right-0 h-0.5",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}

              <button
                onClick={() => onStepClick?.(index)}
                disabled={isPending}
                className={cn(
                  "group relative flex items-start",
                  isPending ? "cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <span className="flex items-center h-8">
                  <span
                    className={cn(
                      "relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isComplete && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                </span>
                <span className="ml-3 min-w-0 flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
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
