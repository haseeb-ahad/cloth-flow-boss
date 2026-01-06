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
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card-based layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => {
          const key = keyExtractor(item);
          const details = mobileCard.details?.(item) || [];
          
          return (
            <div
              key={key}
              className="bg-card rounded-2xl border border-border/50 p-4 transition-all duration-200 active:scale-[0.98]"
              onClick={() => mobileCard.onClick?.(item)}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                {mobileCard.leftIcon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {mobileCard.leftIcon(item)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {mobileCard.title(item)}
                      </h3>
                      {mobileCard.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
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

              {/* Details Grid */}
              {details.length > 0 && (
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

              {/* Actions */}
              {mobileCard.actions && (
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-end gap-2">
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
