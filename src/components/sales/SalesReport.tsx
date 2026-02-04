import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTimezone } from "@/contexts/TimezoneContext";
import { calculateDateRange, DateFilterValue } from "@/hooks/useDateRangeFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileBarChart, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  profit: number;
  is_return?: boolean;
}

interface SaleWithItems {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  paid_amount: number;
  payment_method: string;
  created_at: string;
  status: string;
  description: string | null;
  total_cost: number;
  total_profit: number;
  items: SaleItem[];
}

interface SalesReportProps {
  className?: string;
}

const SalesReport = ({ className }: SalesReportProps) => {
  const { formatDate, timezone } = useTimezone();
  const [isOpen, setIsOpen] = useState(false);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      // Use centralized date range calculation with timezone awareness
      const tz = timezone || 'Asia/Karachi';
      
      // Parse custom dates if provided
      const customStartDate = startDate ? new Date(startDate + "T00:00:00") : undefined;
      const customEndDate = endDate ? new Date(endDate + "T23:59:59") : undefined;
      
      const { start, end } = calculateDateRange({
        dateFilter: dateFilter,
        startDate: customStartDate,
        endDate: customEndDate,
        timezone: tz
      });

      // Apply server-side date filtering
      query = query.gte("created_at", start.toISOString())
                   .lte("created_at", end.toISOString());

      const { data: salesData } = await query;

      if (salesData) {
        const salesWithItems = await Promise.all(
          salesData.map(async (sale) => {
            const { data: items } = await supabase
              .from("sale_items")
              .select("*")
              .eq("sale_id", sale.id);

            const regularItems = items?.filter((item) => !item.is_return) || [];
            const total_cost = regularItems.reduce((sum, item) => sum + item.purchase_price * item.quantity, 0);
            // Profit = Raw Item Profit - Discount
            const rawProfit = regularItems.reduce((sum, item) => sum + item.profit, 0);
            const total_profit = rawProfit - (sale.discount || 0);

            return {
              ...sale,
              total_cost,
              total_profit,
              items: items || [],
            };
          })
        );
        setSales(salesWithItems);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen, dateFilter, startDate, endDate]);

  const toggleExpand = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: { [key: string]: string } = {
      cash: "bg-success text-success-foreground",
      card: "bg-primary text-primary-foreground",
      online: "bg-accent text-accent-foreground",
      credit: "bg-warning text-warning-foreground",
      installment: "bg-secondary text-secondary-foreground",
    };
    return <Badge className={colors[method] || ""}>{method.toUpperCase()}</Badge>;
  };

  const getPaymentStatusBadge = (finalAmount: number, paidAmount: number) => {
    const remaining = finalAmount - (paidAmount || 0);
    if (remaining <= 0) {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    } else if (paidAmount > 0) {
      return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
    }
    return <Badge variant="destructive">Unpaid</Badge>;
  };

  // Summary calculations (profit already has discount subtracted per-sale)
  const totalAmount = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalCost = sales.reduce((sum, s) => sum + s.total_cost, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.total_profit, 0); // Already discount-adjusted
  const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const totalFinalAmount = sales.reduce((sum, s) => sum + s.final_amount, 0);
  const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
  const totalRemaining = sales.reduce((sum, s) => sum + (s.final_amount - (s.paid_amount || 0)), 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FileBarChart className="h-3.5 w-3.5 mr-1.5" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Sales Report</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end py-4 border-b">
          <div className="space-y-1">
            <Label>Filter by Days</Label>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilterValue)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="1week">This Week</SelectItem>
                <SelectItem value="1month">This Month</SelectItem>
                <SelectItem value="1year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === "custom" && (
            <>
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <Button onClick={fetchReportData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <div className="ml-auto text-sm text-muted-foreground">
            Showing {sales.length} sales
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 py-4">
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-bold text-sm">Rs. {totalAmount.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Cost</div>
            <div className="font-bold text-sm text-destructive">Rs. {totalCost.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Profit</div>
            <div className="font-bold text-sm text-success">Rs. {totalProfit.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Discount</div>
            <div className="font-bold text-sm text-warning">Rs. {totalDiscount.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Final</div>
            <div className="font-bold text-sm text-primary">Rs. {totalFinalAmount.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-bold text-sm text-success">Rs. {totalPaid.toFixed(0)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-bold text-sm text-warning">Rs. {totalRemaining.toFixed(0)}</div>
          </Card>
        </div>

        {/* Report Table */}
        <div className="flex-1 max-h-[50vh] overflow-auto border rounded-md">
          <div className="min-w-[1200px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Final Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    No sales found for selected filter
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => {
                  const remaining = sale.final_amount - (sale.paid_amount || 0);
                  const isExpanded = expandedSales.has(sale.id);
                  const regularItems = sale.items.filter((i) => !i.is_return);

                  return (
                    <>
                      <TableRow
                        key={sale.id}
                        className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-primary/10' : ''}`}
                        onClick={() => toggleExpand(sale.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{sale.invoice_number}</TableCell>
                        <TableCell className="text-xs">{formatDate(sale.created_at, "datetime")}</TableCell>
                        <TableCell className="text-xs">{sale.customer_name || "Walk-in"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{regularItems.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">Rs. {sale.total_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">
                          Rs. {sale.total_cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-success">
                          Rs. {sale.total_profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {sale.discount > 0 ? `Rs. ${sale.discount.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          Rs. {sale.final_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-primary">
                          Rs. {(sale.paid_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {remaining > 0 ? (
                            <span className="text-warning">Rs. {remaining.toFixed(2)}</span>
                          ) : (
                            <span className="text-success">0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(sale.final_amount, sale.paid_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentMethodBadge(sale.payment_method)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {sale.description || "-"}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Items */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={15} className="p-0">
                            <div className="p-4 bg-muted/20">
                              <div className="text-sm font-semibold mb-2 text-primary">
                                Items in {sale.invoice_number}:
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Cost Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Profit</TableHead>
                                    <TableHead className="text-center">Type</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sale.items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-sm">{item.product_name}</TableCell>
                                      <TableCell className="text-center">{item.quantity}</TableCell>
                                      <TableCell className="text-right">Rs. {item.unit_price.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-destructive">
                                        Rs. {item.purchase_price.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">Rs. {item.total_price.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-success">
                                        Rs. {item.profit.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {item.is_return ? (
                                          <Badge variant="destructive">Return</Badge>
                                        ) : (
                                          <Badge variant="outline">Sale</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesReport;
