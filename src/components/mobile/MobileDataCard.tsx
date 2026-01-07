import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  leftIcon?: ReactNode;
  rightContent?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  details?: { label: string; value: string | ReactNode }[];
}

const MobileDataCard = ({
  title,
  subtitle,
  badge,
  leftIcon,
  rightContent,
  actions,
  onClick,
  className,
  children,
  details,
}: MobileDataCardProps) => {
  return (
    <div
      className={cn(
        "mobile-data-card w-full transition-all duration-200 active:scale-[0.98] overflow-hidden",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {/* Header - Left aligned */}
      <div className="flex items-start gap-3 w-full">
        {leftIcon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {leftIcon}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="font-semibold text-foreground truncate text-left">{title}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate text-left">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {badge}
              {onClick && !actions && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid - Label above value, vertically stacked */}
      {details && details.length > 0 && (
        <div className="mt-4 mobile-data-grid">
          {details.map((detail, index) => (
            <div key={index} className="mobile-data-row min-w-0 overflow-hidden">
              <p className="mobile-data-label">{detail.label}</p>
              <div className="mobile-data-value">
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Right Content - Left aligned on mobile */}
      {rightContent && (
        <div className="mt-4 flex items-center justify-start md:justify-end w-full">
          {rightContent}
        </div>
      )}

      {/* Custom Children */}
      {children}

      {/* Actions - Full width buttons stacked on mobile */}
      {actions && (
        <div className="mt-4 pt-4 border-t border-border/50 mobile-btn-stack">
          {actions}
        </div>
      )}
    </div>
  );
};

export default MobileDataCard;
