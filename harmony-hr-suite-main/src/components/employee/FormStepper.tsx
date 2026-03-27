import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  icon?: React.ReactNode;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
}

export function FormStepper({ steps, currentStep, completedSteps = [], onStepClick }: FormStepperProps) {
  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <div className="w-full space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold">{currentStep + 1}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
            <p className="font-semibold text-foreground">{steps[currentStep]?.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</p>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
        {/* Progress Glow Effect */}
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent blur-sm opacity-50 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Tabs */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = true; // All tabs are clickable
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                "group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out",
                "border backdrop-blur-sm",
                // Completed state
                isCompleted && !isCurrent && [
                  "bg-primary/10 border-primary/30 text-primary",
                  "hover:bg-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                ],
                // Current state
                isCurrent && [
                  "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary",
                  "shadow-lg shadow-primary/25 scale-105"
                ],
                // Inactive state (future steps)
                !isCompleted && !isCurrent && [
                  "bg-muted/30 border-border/50 text-muted-foreground",
                  "hover:bg-muted/50 hover:border-border hover:text-foreground"
                ],
                isClickable && "cursor-pointer"
              )}
            >
              {/* Step Indicator */}
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300",
                isCompleted && !isCurrent && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary-foreground text-primary",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}>
                {isCompleted && !isCurrent ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  step.id + 1
                )}
              </span>
              
              {/* Step Label - Always visible on desktop, hidden on mobile */}
              <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
              
              {/* Step Icon on mobile */}
              <span className="sm:hidden">{step.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
