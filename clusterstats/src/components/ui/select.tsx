import * as React from "react"
import { cn } from "cn"
import { Select as SelectPrimitive } from "radix-ui"

/* shadcn/ui Select on Radix, styled to match the TradeForge select (tokens: --tf-* in index.css). */

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

const Chevron = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Check = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-fit items-center justify-between gap-2 rounded-[0.375rem] border border-(--tf-input) bg-(--tf-background) pr-2 pl-3 text-xs whitespace-nowrap text-(--tf-foreground) shadow-xs outline-none",
        "transition-[color,background-color,border-color,box-shadow]",
        "hover:bg-(--tf-accent) data-[state=open]:border-(--tf-ring)/60",
        "focus-visible:border-(--tf-ring) focus-visible:ring-[3px] focus-visible:ring-(--tf-ring)/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>span]:line-clamp-1 [&>span]:text-left [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <Chevron className="size-4 text-(--tf-muted)" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[8rem] overflow-hidden rounded-[0.5rem] border border-(--tf-border) bg-(--tf-popover) text-(--tf-foreground) shadow-lg",
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)] data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center rounded-[0.375rem] py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "focus:bg-(--tf-accent) focus:text-(--tf-foreground) data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-(--tf-primary)" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
