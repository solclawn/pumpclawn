import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-light)] disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent-red)] text-[var(--text-light)] px-4 py-2 gap-2 hover:bg-[var(--accent-red-hover)]',
        secondary: 'border border-[var(--border-dark-secondary)] px-4 py-2 text-[var(--text-secondary)] bg-transparent hover:border-[var(--accent-teal)] hover:text-[var(--text-primary)]',
        ghost: 'text-[var(--text-secondary)] px-3 py-2 hover:bg-black/5',
        teal: 'bg-[var(--accent-teal)] text-[var(--bg-dark)] px-4 py-2 hover:bg-[var(--accent-teal-hover)]'
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-base'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref as any}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
