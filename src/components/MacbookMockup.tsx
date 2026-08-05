import React from "react";

interface MacbookMockupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * MacBook-style device frame. The provided children render inside the screen.
 */
export function MacbookMockup({ children, className = "" }: MacbookMockupProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Lid / screen */}
      <div className="relative mx-auto w-full rounded-t-[1.25rem] border border-border/60 bg-gradient-to-b from-muted to-muted/60 p-[1.5%] pb-[1.2%] shadow-2xl">
        <div className="relative overflow-hidden rounded-[0.75rem] bg-background ring-1 ring-border/70">
          {/* Camera notch */}
          <div className="absolute left-1/2 top-0 z-10 h-[1.6%] min-h-[6px] w-[18%] -translate-x-1/2 rounded-b-lg bg-muted-foreground/20" />
          <div className="[&_img]:block [&_img]:w-full [&_img]:h-auto">{children}</div>
          {/* Screen glare */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        </div>
      </div>

      {/* Base / hinge */}
      <div className="relative mx-auto h-3 w-[108%] max-w-none -translate-x-[3.7%] rounded-b-[0.6rem] bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/15 shadow-lg">
        <div className="absolute left-1/2 top-0 h-[38%] w-[14%] -translate-x-1/2 rounded-b-full bg-muted-foreground/30" />
      </div>
      <div className="mx-auto h-1 w-[70%] rounded-b-full bg-foreground/10 blur-[1px]" />
    </div>
  );
}

export default MacbookMockup;
