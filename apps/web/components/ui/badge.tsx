import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'verified' | 'pending' | 'error' | 'neutral';

const toneStyles: Record<Tone, string> = {
  verified: 'bg-[var(--accent-teal)] text-[var(--bg-dark)]',
  pending: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
  error: 'bg-red-100 text-red-700 border border-red-300',
  neutral: 'bg-[var(--bg-light)] text-[var(--text-secondary)] border border-[var(--border-light)]'
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  pill?: boolean;
}

export function Badge({ className, tone = 'neutral', pill = true, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-1 font-medium',
        pill ? 'rounded-full' : 'rounded-md',
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
