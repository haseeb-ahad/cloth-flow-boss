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
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {badge}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 md:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePageHeader;
