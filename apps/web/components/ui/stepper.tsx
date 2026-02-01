import { cn } from '@/lib/utils';

const steps = ['Draft', 'Minted', 'Claimed', 'Distributed'] as const;
export type Step = (typeof steps)[number];

interface StepperProps {
  current: Step;
}

export function Stepper({ current }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, idx) => {
        const active = steps.indexOf(current) >= idx;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'h-9 w-9 rounded-full border flex items-center justify-center text-xs font-semibold transition',
                active
                  ? 'border-transparent bg-[var(--accent-teal)] text-[var(--bg-dark)] shadow-glow'
                  : 'border-[var(--border-light)] text-[var(--text-secondary)]'
              )}
            >
              {idx + 1}
            </div>
            <span className={cn('text-sm', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
              {step}
            </span>
            {idx < steps.length - 1 && <div className="h-px w-8 bg-[var(--border)]" />}
          </div>
        );
      })}
    </div>
  );
}
