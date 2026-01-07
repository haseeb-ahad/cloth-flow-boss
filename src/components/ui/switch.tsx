import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Mobile: 40x22px (min-height 22px)
      "peer inline-flex min-h-[22px] h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-[999px] border-2 border-transparent transition-all duration-200 ease-out",
      // Tablet & Desktop: 80x44px (no min-height constraint)
      "md:min-h-0 md:h-[44px] md:w-[80px]",
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
        // Mobile: 18px thumb
        "pointer-events-none block h-[18px] w-[18px] rounded-[999px] bg-background shadow-md ring-0 transition-transform duration-200 ease-out",
        // Tablet & Desktop: 40px thumb
        "md:h-[40px] md:w-[40px]",
        // Position based on state
        "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0",
        // Desktop uses larger offset
        "md:data-[state=checked]:translate-x-[36px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
