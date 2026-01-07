import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface MobileCardConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string | undefined;
  badge?: (item: T) => ReactNode;
  leftIcon?: (item: T) => ReactNode;
  details?: (item: T) => { label: string; value: string | ReactNode }[];
  actions?: (item: T) => ReactNode;
  onClick?: (item: T) => void;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  mobileCard: MobileCardConfig<T>;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

function ResponsiveTable<T>({
  data,
  columns,
  mobileCard,
  keyExtractor,
  emptyMessage = "No data found",
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="mobile-empty-state text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card-based layout with proper alignment rules
  if (isMobile) {
    return (
      <div className="mobile-card-list overflow-x-hidden w-full">
        {data.map((item) => {
          const key = keyExtractor(item);
          const details = mobileCard.details?.(item) || [];
          
          return (
            <div
              key={key}
              className="mobile-data-card transition-all duration-200 active:scale-[0.98] overflow-hidden"
              onClick={() => mobileCard.onClick?.(item)}
            >
              {/* Header - Left aligned */}
              <div className="flex items-start gap-3 w-full">
                {mobileCard.leftIcon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {mobileCard.leftIcon(item)}
                  </div>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h3 className="font-semibold text-foreground truncate text-left">
                        {mobileCard.title(item)}
                      </h3>
                      {mobileCard.subtitle && (
                        <p className="text-sm text-muted-foreground truncate text-left">
                          {mobileCard.subtitle(item)}
                        </p>
                      )}
                    </div>
                    {mobileCard.badge && (
                      <div className="flex-shrink-0">
                        {mobileCard.badge(item)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid - Label above value */}
              {details.length > 0 && (
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

              {/* Actions - Full width stacked buttons */}
              {mobileCard.actions && (
                <div className="mt-4 pt-4 border-t border-border/50 mobile-btn-stack">
                  {mobileCard.actions(item)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: Traditional table
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={keyExtractor(item)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.cell(item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ResponsiveTable;
