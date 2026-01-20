import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, Trash2, Search, RefreshCw, Download, Upload, FileText, ImageIcon, CalendarIcon } from "lucide-react";
import SalesReport from "@/components/sales/SalesReport";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { exportSalesToCSV, parseSalesCSV } from "@/lib/csvExport";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface Sale {
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
  image_url: string | null;
}

interface SaleWithDetails extends Sale {
  total_cost: number;
  total_profit: number;
  item_count: number;
}

const Sales = () => {
  const navigate = useNavigate();
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDate } = useTimezone();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  // Permission checks
  const canCreate = userRole === "admin" || hasPermission("sales", "create");
  const canEdit = userRole === "admin" || hasPermission("sales", "edit");
  const canDelete = userRole === "admin" || hasPermission("sales", "delete");
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { timezone } = useTimezone();

  // Helper function to get current date parts in user's timezone
  const getDatePartsInTimezone = (date: Date, tz: string) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    return { year, month, day };
  };

  // Get timezone offset in milliseconds
  const getTimezoneOffsetMs = (tz: string) => {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return tzDate.getTime() - utcDate.getTime();
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const tz = timezone || 'Asia/Karachi';
    const todayParts = getDatePartsInTimezone(now, tz);
    const tzOffset = getTimezoneOffsetMs(tz);
    
    const createDateRange = (startYear: number, startMonth: number, startDay: number, endYear: number, endMonth: number, endDay: number) => {
      const startLocal = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);
      const endLocal = new Date(endYear, endMonth, endDay, 23, 59, 59, 999);
      return {
        start: new Date(startLocal.getTime() - tzOffset),
        end: new Date(endLocal.getTime() - tzOffset)
      };
    };

    switch (dateRangeFilter) {
      case "all":
        // Include all data from epoch start to far future
        return { start: new Date(0), end: new Date('2099-12-31T23:59:59.999Z') };
      case "today":
        return createDateRange(todayParts.year, todayParts.month, todayParts.day, todayParts.year, todayParts.month, todayParts.day);
      case "yesterday": {
        const yesterday = new Date(todayParts.year, todayParts.month, todayParts.day - 1);
        return createDateRange(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      }
      case "1week": {
        const weekAgo = new Date(todayParts.year, todayParts.month, todayParts.day - 7);
        return createDateRange(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate(), todayParts.year, todayParts.month, todayParts.day);
      }
      case "1month": {
        const monthAgo = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
        return createDateRange(monthAgo.getFullYear(), monthAgo.getMonth(), monthAgo.getDate(), todayParts.year, todayParts.month, todayParts.day);
      }
      case "1year": {
        const yearAgo = new Date(todayParts.year - 1, todayParts.month, todayParts.day);
        return createDateRange(yearAgo.getFullYear(), yearAgo.getMonth(), yearAgo.getDate(), todayParts.year, todayParts.month, todayParts.day);
      }
      case "custom":
        if (startDate && endDate) {
          return createDateRange(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        } else if (startDate) {
          return createDateRange(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), todayParts.year, todayParts.month, todayParts.day);
        } else if (endDate) {
          return { start: new Date(0), end: new Date(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime() - tzOffset) };
        }
        return createDateRange(todayParts.year, todayParts.month, todayParts.day, todayParts.year, todayParts.month, todayParts.day);
      default:
        // Include all data by default
        return { start: new Date(0), end: new Date('2099-12-31T23:59:59.999Z') };
    }
  };

  const fetchSaleItems = async (saleId: string) => {
    const { data } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId);
    return data || [];
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      await exportSalesToCSV(filteredSales, fetchSaleItems);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedSales = parseSalesCSV(text);
      
      if (parsedSales.length === 0) {
        toast.error("No valid sales found in CSV");
        return;
      }

      let imported = 0;
      for (const { sale, items } of parsedSales) {
        // Insert sale
        const { data: newSale, error: saleError } = await supabase
          .from("sales")
          .insert({
            ...sale,
            owner_id: ownerId,
          })
          .select()
          .single();
        
        if (saleError || !newSale) continue;

        // Insert items
        if (items.length > 0) {
          for (const item of items) {
            await supabase.from("sale_items").insert({
              sale_id: newSale.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              purchase_price: item.purchase_price,
              total_price: item.total_price,
              profit: item.profit,
            });
          }
        }
        imported++;
      }

      toast.success(`Successfully imported ${imported} sales with items`);
      fetchSales();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchSales();

    // Subscribe to real-time changes for instant sync
    const salesChannel = supabase
      .channel('sales-page-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchSales()
      )
      .subscribe();

    const saleItemsChannel = supabase
      .channel('sales-items-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => fetchSales()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(saleItemsChannel);
    };
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, dateRangeFilter, startDate, endDate]);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data) {
        // Calculate total cost and profit for each sale
        const salesWithDetails = await Promise.all(data.map(async (sale) => {
          const { data: saleItems } = await supabase
            .from("sale_items")
            .select("*")
            .eq("sale_id", sale.id);
          
          // Filter out return items - they are tracking only, original qty already reduced
          const regularItems = saleItems?.filter(item => !item.is_return) || [];
          
          const total_cost = regularItems.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
          const total_profit = regularItems.reduce((sum, item) => sum + item.profit, 0);
          const item_count = regularItems.length;
          
          return {
            ...sale,
            total_cost,
            total_profit,
            item_count
          };
        }));
        
        setSales(salesWithDetails);
        setFilteredSales(salesWithDetails);
      }
      toast.success(t("salesRefreshed"));
    } catch (error) {
      toast.error(t("errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = [...sales];

    if (searchTerm) {
      filtered = filtered.filter(sale => 
        (sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.customer_phone?.includes(searchTerm))
      );
    }

    // Apply date range filter
    if (dateRangeFilter !== "all") {
      const { start, end } = getDateRangeFilter();
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      });
    }

    setFilteredSales(filtered);
  };

  const handleEdit = (saleId: string) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit sales.");
      return;
    }
    navigate(`/invoice?edit=${saleId}`);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete sales.");
      return;
    }
    if (!confirm("Are you sure you want to delete this sale?")) return;

    try {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", id);

      // Restore stock for all items
      if (saleItems) {
        for (const item of saleItems) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .maybeSingle();

          if (product) {
            await supabase
              .from("products")
              .update({ stock_quantity: product.stock_quantity + item.quantity })
              .eq("id", item.product_id);
          }
        }
        await supabase.from("sale_items").delete().eq("sale_id", id);
      }

      // Delete sale (credits will be automatically deleted due to CASCADE)
      await supabase.from("sales").delete().eq("id", id);
      toast.success("Sale deleted successfully! Inventory and credits updated.");
      fetchSales();
    } catch (error) {
      toast.error("Failed to delete sale");
    }
  };


  const getPaymentMethodBadge = (method: string) => {
    const colors: { [key: string]: string } = {
      cash: "bg-success text-success-foreground",
      card: "bg-primary text-primary-foreground",
      online: "bg-accent text-accent-foreground",
      credit: "bg-warning text-warning-foreground",
      installment: "bg-secondary text-secondary-foreground",
    };
    const labels: { [key: string]: string } = {
      cash: t("cash"),
      card: t("card"),
      online: t("online"),
      credit: t("credit"),
    };
    return (
      <Badge className={colors[method] || ""}>
        {labels[method] || method.toUpperCase()}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (finalAmount: number, paidAmount: number) => {
    const remaining = finalAmount - (paidAmount || 0);
    if (remaining <= 0) {
      return <Badge className="bg-success text-success-foreground">{t("paid")}</Badge>;
    } else if (paidAmount > 0) {
      return <Badge className="bg-warning text-warning-foreground">{t("partial")}</Badge>;
    }
    return <Badge variant="destructive">{t("unpaid")}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedLogoLoader size="lg" showMessage message={t("loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">{t("salesHistory")}</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">{t("viewManageTransactions")}</p>
          </div>
          <span className="text-xs md:text-sm font-medium text-primary bg-primary/10 px-2 md:px-3 py-1 rounded-full">
            {t("total")}: {filteredSales.length}
          </span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <SalesReport />
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          {canCreate && (
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              size="sm"
              disabled={isLoading || isImporting}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {isImporting ? t("loading") : t("importCSV")}
            </Button>
          )}
          <Button 
            onClick={handleExportCSV} 
            variant="outline"
            size="sm"
            disabled={isLoading || filteredSales.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {t("exportCSV")}
          </Button>
          <Button 
            onClick={fetchSales} 
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search and Filters - Mobile Optimized */}
      <Card className="p-4">
        <div className="mobile-filter-row mb-4">
          <div>
            <Label className="text-xs md:text-sm">{t("searchByNamePhoneInvoice")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs md:text-sm">{t("filterByDate")}</Label>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectRange")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                <SelectItem value="today">{t("today")}</SelectItem>
                <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
                <SelectItem value="1week">{t("oneWeek")}</SelectItem>
                <SelectItem value="1month">{t("oneMonth")}</SelectItem>
                <SelectItem value="1year">{t("oneYear")}</SelectItem>
                <SelectItem value="custom">{t("custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateRangeFilter === "custom" && (
            <>
              <div>
                <Label className="text-xs md:text-sm">{t("startDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PP") : t("startDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs md:text-sm">{t("endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PP") : t("endDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
          <div className="flex items-end">
            <Button 
              onClick={() => { setSearchTerm(""); setDateRangeFilter("all"); setStartDate(undefined); setEndDate(undefined); }} 
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {t("clearFilters")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sales List - Mobile Cards or Desktop Table */}
      {isMobile ? (
        // Mobile Card Layout
        <div className="space-y-3">
          {filteredSales.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {t("noSalesFound")}
            </Card>
          ) : (
            filteredSales.map((sale) => {
              const remainingAmount = sale.final_amount - (sale.paid_amount || 0);
              return (
                <Card key={sale.id} className="p-4 active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{sale.invoice_number}</h3>
                        {getPaymentStatusBadge(sale.final_amount, sale.paid_amount)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(sale.created_at, 'datetime')}
                      </p>
                      <p className="text-sm text-foreground mt-1 truncate">
                        {sale.customer_name || t("walkInCustomer")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">Rs. {sale.final_amount.toFixed(0)}</p>
                      <p className="text-xs text-success font-medium">+Rs. {sale.total_profit.toFixed(0)}</p>
                    </div>
                  </div>
                  
                  {/* Details Grid */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("items")}</p>
                      <p className="text-sm font-semibold text-primary">{sale.item_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("paid")}</p>
                      <p className="text-sm font-medium text-foreground">Rs. {(sale.paid_amount || 0).toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("remaining")}</p>
                      <p className={`text-sm font-medium ${remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                        Rs. {remainingAmount.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("method")}</p>
                      {getPaymentMethodBadge(sale.payment_method)}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {sale.description && (
                        <span title={sale.description} className="cursor-help">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      {sale.image_url && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="cursor-pointer hover:opacity-80">
                              <ImageIcon className="h-4 w-4 text-primary" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <img 
                              src={sale.image_url} 
                              alt="Invoice attachment" 
                              className="w-full h-auto rounded-lg"
                            />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(sale.id)} disabled={isLoading}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        // Desktop Table Layout
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Final amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Notes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const remainingAmount = sale.final_amount - (sale.paid_amount || 0);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                    <TableCell>
                      {formatDate(sale.created_at, 'datetime')}
                    </TableCell>
                    <TableCell>{sale.customer_name || "Walk-in Customer"}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-medium px-2 py-1 rounded-full text-sm">
                        {sale.item_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">Rs. {sale.total_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive">Rs. {sale.total_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-success">Rs. {sale.total_profit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {sale.discount > 0 ? (
                        <span className="text-destructive">- Rs. {sale.discount.toFixed(2)}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      Rs. {sale.final_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      Rs. {(sale.paid_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {remainingAmount > 0 ? (
                        <span className="text-warning font-medium">Rs. {remainingAmount.toFixed(2)}</span>
                      ) : (
                        <Badge className="bg-gradient-to-r from-success to-primary text-white font-semibold shadow-md hover:shadow-lg transition-all">
                          All Done ✓
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentStatusBadge(sale.final_amount, sale.paid_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentMethodBadge(sale.payment_method)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sale.description && (
                          <span title={sale.description} className="cursor-help">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        {sale.image_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="cursor-pointer hover:opacity-80">
                                <ImageIcon className="h-4 w-4 text-primary" />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <img 
                                src={sale.image_url} 
                                alt="Invoice attachment" 
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        {!sale.description && !sale.image_url && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit && (
                        <Button size="icon" variant="outline" onClick={() => handleEdit(sale.id)} disabled={isLoading}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

    </div>
  );
};

export default Sales;
