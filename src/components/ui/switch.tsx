import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Mobile-first: 40x22px
      "peer inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-[999px] border-2 border-transparent transition-all duration-200 ease-out",
      // Desktop: original 44x24px
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
        // Mobile-first: 18px thumb
        "pointer-events-none block h-[18px] w-[18px] rounded-[999px] bg-background shadow-md ring-0 transition-transform duration-200 ease-out",
        // Desktop: 20px thumb
        "md:h-5 md:w-5",
        // Position based on state
        "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0",
        // Desktop uses 20px offset
        "md:data-[state=checked]:translate-x-5",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
