import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <span className="inline-flex items-center justify-center sm:min-w-0 sm:min-h-0 max-[639px]:min-w-[44px] max-[639px]:min-h-[44px] max-[639px]:p-0">
    <SwitchPrimitives.Root
      className={cn(
        // Mobile-first: 48x26px with 22px thumb (only for < 640px)
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-[999px] border-2 border-transparent transition-all duration-200 ease-out",
        // Mobile dimensions (< 640px)
        "max-[639px]:h-[26px] max-[639px]:w-[48px] max-[639px]:min-h-[22px]",
        // Tablet and desktop: original 24x44px with 20px thumb
        "sm:h-6 sm:w-11",
        // States with clear visual feedback
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30",
        // Focus states
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          // Base styles
          "pointer-events-none block rounded-[999px] bg-background shadow-md ring-0 transition-transform duration-200 ease-out",
          // Mobile thumb: 22px (< 640px)
          "max-[639px]:h-[22px] max-[639px]:w-[22px] max-[639px]:min-h-[22px]",
          // Tablet and desktop thumb: 20px
          "sm:h-5 sm:w-5",
          // Position based on state - mobile uses 22px offset
          "max-[639px]:data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0",
          // Tablet/desktop uses 20px offset
          "sm:data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitives.Root>
  </span>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
