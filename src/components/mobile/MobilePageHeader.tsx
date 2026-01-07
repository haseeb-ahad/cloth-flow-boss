import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const MobilePageHeader = ({
  title,
  subtitle,
  badge,
  actions,
  className,
}: MobilePageHeaderProps) => {
  return (
    <div className={cn("mobile-section-gap w-full overflow-hidden", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full">
        {/* Title area - left aligned */}
        <div className="flex items-center gap-3 mobile-align-left">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight text-left truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mt-1 text-left truncate">
                {subtitle}
              </p>
            )}
          </div>
          {badge}
        </div>
        {/* Actions - full width buttons stacked on mobile */}
        {actions && (
          <div className="mobile-btn-stack md:flex-row md:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePageHeader;
