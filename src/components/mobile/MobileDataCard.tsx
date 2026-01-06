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
        "bg-card rounded-2xl border border-border/50 p-4 transition-all duration-200 active:scale-[0.98]",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {leftIcon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {leftIcon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
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

      {/* Details Grid */}
      {details && details.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {details.map((detail, index) => (
            <div key={index} className="min-w-0">
              <p className="text-xs text-muted-foreground">{detail.label}</p>
              <div className="text-sm font-medium text-foreground truncate">
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Right Content */}
      {rightContent && (
        <div className="mt-4 flex items-center justify-end">
          {rightContent}
        </div>
      )}

      {/* Custom Children */}
      {children}

      {/* Actions */}
      {actions && (
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default MobileDataCard;
