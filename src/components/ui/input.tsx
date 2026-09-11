import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-[50px] w-full rounded-[10px] border border-border bg-transparent px-4 py-2 text-body text-text-primary placeholder:text-secondary md:h-11 md:rounded-md md:border-border-soft md:bg-surface-card md:px-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/40',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
