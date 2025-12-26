import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineSales } from "@/hooks/useOfflineSales";
import { useOfflineProducts } from "@/hooks/useOfflineProducts";
import * as offlineDb from "@/lib/offlineDb";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Search, RefreshCw, Download, Upload, FileText, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { exportSalesToCSV, parseSalesCSV } from "@/lib/csvExport";
import { toast } from "sonner";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { OfflineIndicator } from "@/components/OfflineIndicator";

interface SaleWithDetails {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount: number | null;
  final_amount: number;
  paid_amount: number | null;
  payment_method: string | null;
  created_at: string | undefined;
  status: string | null;
  description: string | null;
  image_url: string | null;
  total_cost: number;
  total_profit: number;
  item_count: number;
}

const Sales = () => {
  const navigate = useNavigate();
  const { ownerId, hasPermission, userRole, user } = useAuth();
  const { formatDate } = useTimezone();
  const { isOnline } = useOffline();
  
  // Offline hooks
  const { sales: offlineSales, isLoading: salesLoading, refetch: refetchSales, getSaleItems, deleteSale } = useOfflineSales();
  const { products, updateProduct } = useOfflineProducts();
  
  // Permission checks
  const canCreate = userRole === "admin" || hasPermission("sales", "create");
  const canEdit = userRole === "admin" || hasPermission("sales", "edit");
  const canDelete = userRole === "admin" || hasPermission("sales", "delete");
  
  const [salesWithDetails, setSalesWithDetails] = useState<SaleWithDetails[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sales with details from offline data
  const loadSalesWithDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const salesDetails: SaleWithDetails[] = await Promise.all(
        offlineSales.map(async (sale) => {
          const saleItems = await getSaleItems(sale.id);
          const regularItems = saleItems.filter(item => !item.is_return);
          
          const total_cost = regularItems.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
          const total_profit = regularItems.reduce((sum, item) => sum + item.profit, 0);
          const item_count = regularItems.length;
          
          return {
            id: sale.id,
            invoice_number: sale.invoice_number,
            customer_name: sale.customer_name || null,
            customer_phone: sale.customer_phone || null,
            total_amount: sale.total_amount,
            discount: sale.discount || 0,
            final_amount: sale.final_amount,
            paid_amount: sale.paid_amount || 0,
            payment_method: sale.payment_method || 'cash',
            created_at: sale.created_at,
            status: sale.status || 'completed',
            description: sale.description || null,
            image_url: sale.image_url || null,
            total_cost,
            total_profit,
            item_count,
          };
        })
      );
      
      setSalesWithDetails(salesDetails);
      setFilteredSales(salesDetails);
    } catch (error) {
      console.error("Error loading sales details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [offlineSales, getSaleItems]);

  // Fetch sale items for CSV export (uses offline DB)
  const fetchSaleItemsForExport = async (saleId: string) => {
    return await getSaleItems(saleId);
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      await exportSalesToCSV(filteredSales, fetchSaleItemsForExport);
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
        // Store in offline DB
        const saleId = crypto.randomUUID();
        const invoiceNumber = `INV-${Date.now()}-${imported}`;
        
        await offlineDb.put('sales', {
          id: saleId,
          invoice_number: invoiceNumber,
          ...sale,
          owner_id: ownerId,
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any, 'pending', user?.id);

        // Insert items
        for (const item of items) {
          await offlineDb.put('sale_items', {
            id: crypto.randomUUID(),
            sale_id: saleId,
            ...item,
            is_deleted: false,
          } as any, 'pending', user?.id);
        }
        imported++;
      }

      toast.success(`Successfully imported ${imported} sales${!isOnline ? ' (offline)' : ''}`);
      refetchSales();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Load sales details when offline sales change
  useEffect(() => {
    if (offlineSales.length > 0 || !salesLoading) {
      loadSalesWithDetails();
    }
  }, [offlineSales, loadSalesWithDetails, salesLoading]);

  // Real-time subscription only when online
  useEffect(() => {
    if (!isOnline) return;

    const salesChannel = supabase
      .channel('sales-page-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => refetchSales()
      )
      .subscribe();

    const saleItemsChannel = supabase
      .channel('sales-items-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => refetchSales()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(saleItemsChannel);
    };
  }, [isOnline, refetchSales]);

  // Filter sales effect
  useEffect(() => {
    filterSales();
  }, [salesWithDetails, searchTerm, dateFilter]);

  const filterSales = () => {
    let filtered = [...salesWithDetails];

    if (searchTerm) {
      filtered = filtered.filter(sale => 
        (sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.customer_phone?.includes(searchTerm))
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(sale => 
        sale.created_at?.startsWith(dateFilter)
      );
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
      // Get sale items from offline DB
      const saleItems = await getSaleItems(id);

      // Restore stock for all items using offline hook
      for (const item of saleItems) {
        if (item.is_return) continue; // Skip return items
        
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await updateProduct(item.product_id, { 
            stock_quantity: product.stock_quantity + item.quantity 
          });
        }
      }

      // Delete sale using offline hook
      await deleteSale(id);
      toast.success(isOnline ? "Sale deleted successfully!" : "Sale deleted offline - will sync when online");
      refetchSales();
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
    return (
      <Badge className={colors[method] || ""}>
        {method.toUpperCase()}
      </Badge>
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedLogoLoader size="lg" showMessage message="Loading sales data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Sales History</h1>
            <p className="text-muted-foreground mt-1 text-base">View and manage all transactions</p>
          </div>
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            Total: {filteredSales.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
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
              disabled={isLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          )}
          <Button 
            onClick={handleExportCSV} 
            variant="outline"
            disabled={isLoading || filteredSales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={refetchSales} 
            variant="outline" 
            size="icon"
            disabled={isLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <Label>Search by Name, Phone, or Invoice</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label>Filter by Date</Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => { setSearchTerm(""); setDateFilter(""); }} 
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

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
                    {(sale.discount || 0) > 0 ? (
                      <span className="text-destructive">- Rs. {(sale.discount || 0).toFixed(2)}</span>
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

    </div>
  );
};

export default Sales;
