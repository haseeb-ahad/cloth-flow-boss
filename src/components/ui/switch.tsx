import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <span className="inline-flex items-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 justify-center">
    <SwitchPrimitives.Root
      className={cn(
        // Mobile-first: 48x26px with 22px thumb
        "peer inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer items-center rounded-[999px] border-2 border-transparent transition-all duration-200 ease-out",
        // Desktop: original 44x24px with 20px thumb
        "md:h-6 md:w-11",
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
          // Mobile-first: 22px thumb
          "pointer-events-none block h-[22px] w-[22px] rounded-[999px] bg-background shadow-md ring-0 transition-transform duration-200 ease-out",
          // Desktop: 20px thumb
          "md:h-5 md:w-5",
          // Position based on state - mobile uses 22px offset (48 - 22 - 4 border = 22)
          "data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0",
          // Desktop uses 20px offset
          "md:data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitives.Root>
  </span>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
