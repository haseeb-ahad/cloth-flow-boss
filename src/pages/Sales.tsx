import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDatePKT } from "@/lib/utils";
import { Edit, Trash2, Search, RefreshCw, Download } from "lucide-react";
import { exportSalesToPDF } from "@/lib/pdfExport";
import { toast } from "sonner";

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
}

interface SaleWithDetails extends Sale {
  total_cost: number;
  total_profit: number;
  item_count: number;
}

const Sales = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, dateFilter]);

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
          
          const total_cost = saleItems?.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0) || 0;
          const total_profit = saleItems?.reduce((sum, item) => sum + item.profit, 0) || 0;
          const item_count = saleItems?.length || 0;
          
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
      toast.success("Sales data refreshed");
    } catch (error) {
      toast.error("Failed to fetch sales");
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

    if (dateFilter) {
      filtered = filtered.filter(sale => 
        sale.created_at.startsWith(dateFilter)
      );
    }

    setFilteredSales(filtered);
  };

  const handleEdit = (saleId: string) => {
    navigate(`/invoice?edit=${saleId}`);
  };

  const handleDelete = async (id: string) => {
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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
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
        <div className="flex gap-2">
          <Button 
            onClick={() => exportSalesToPDF(filteredSales)} 
            variant="outline"
            disabled={isLoading || filteredSales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            onClick={fetchSales} 
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
                    {formatDatePKT(sale.created_at, 'datetime')}
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
                    <Button size="icon" variant="outline" onClick={() => handleEdit(sale.id)} disabled={isLoading}>
                      <Edit className="h-4 w-4" />
                    </Button>
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
