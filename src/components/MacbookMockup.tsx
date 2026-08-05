import React from "react";

interface MacbookMockupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Silver MacBook-style device frame. Children render inside the screen.
 * Device chrome uses fixed silver tones (physical object, not themed).
 */
export function MacbookMockup({ children, className = "" }: MacbookMockupProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Lid / screen */}
      <div
        className="relative mx-auto w-full rounded-t-[1.25rem] p-[1.4%] pb-[1.1%] shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #f2f3f5 0%, #d7dade 38%, #b9bec4 72%, #e6e8eb 100%)",
          border: "1px solid #c9ced4",
        }}
      >
        <div className="relative overflow-hidden rounded-[0.8rem] bg-black" style={{ border: "2px solid #1b1d20" }}>
          {/* Camera notch */}
          <div className="absolute left-1/2 top-0 z-10 h-[1.6%] min-h-[5px] w-[16%] -translate-x-1/2 rounded-b-lg bg-black/80" />
          <div className="[&_img]:block [&_img]:h-auto [&_img]:w-full">{children}</div>
          {/* Screen glare */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12]" />
        </div>
      </div>

      {/* Hinge + base */}
      <div
        className="relative mx-auto h-[10px] w-[112%] -translate-x-[5.35%] rounded-b-[0.5rem]"
        style={{ background: "linear-gradient(180deg, #cdd2d7 0%, #aab0b7 55%, #8f959c 100%)" }}
      >
        <div
          className="absolute left-1/2 top-0 h-[42%] w-[13%] -translate-x-1/2 rounded-b-full"
          style={{ background: "linear-gradient(180deg, #9aa0a7, #c3c8ce)" }}
        />
      </div>
      <div className="mx-auto h-[6px] w-[72%] rounded-b-full bg-black/25 blur-[3px]" />
    </div>
  );
}

export default MacbookMockup;
