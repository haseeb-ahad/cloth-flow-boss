import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  created_at: string;
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, dateFilter]);

  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSales(data);
      setFilteredSales(data);
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

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Get sale items to restore stock
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", id);

      // Restore stock for each item
      if (saleItems) {
        for (const item of saleItems) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({ stock_quantity: product.stock_quantity + item.quantity })
              .eq("id", item.product_id);
          }
        }

        // Delete sale items
        await supabase.from("sale_items").delete().eq("sale_id", id);
      }

      // Delete sale
      await supabase.from("sales").delete().eq("id", id);
      toast.success("Sale deleted successfully!");
      fetchSales();
    } catch (error) {
      toast.error("Failed to delete sale");
    }
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;

    try {
      // Get original sale items to calculate stock changes
      const { data: originalItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", editingSale.id);

      await supabase
        .from("sales")
        .update({
          customer_name: editingSale.customer_name,
          customer_phone: editingSale.customer_phone,
          discount: editingSale.discount,
          final_amount: editingSale.total_amount - editingSale.discount,
        })
        .eq("id", editingSale.id);

      toast.success("Sale updated successfully!");
      setIsEditDialogOpen(false);
      fetchSales();
    } catch (error) {
      toast.error("Failed to update sale");
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: { [key: string]: string } = {
      cash: "bg-success text-success-foreground",
      card: "bg-primary text-primary-foreground",
      online: "bg-accent text-accent-foreground",
      credit: "bg-warning text-warning-foreground",
    };
    return (
      <Badge className={colors[method] || ""}>
        {method.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sales History</h1>
        <p className="text-muted-foreground">View all transactions</p>
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
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Final Amount</TableHead>
              <TableHead className="text-center">Payment</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                <TableCell>
                  {format(new Date(sale.created_at), "dd MMM yyyy, hh:mm a")}
                </TableCell>
                <TableCell>{sale.customer_name || "Walk-in Customer"}</TableCell>
                <TableCell className="text-right">Rs. {sale.total_amount.toFixed(2)}</TableCell>
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
                <TableCell className="text-center">
                  {getPaymentMethodBadge(sale.payment_method)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-2 justify-center">
                    <Button size="icon" variant="outline" onClick={() => handleEdit(sale)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(sale.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <div className="space-y-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={editingSale.customer_name || ""}
                  onChange={(e) => setEditingSale({ ...editingSale, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Customer Phone</Label>
                <Input
                  value={editingSale.customer_phone || ""}
                  onChange={(e) => setEditingSale({ ...editingSale, customer_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={editingSale.discount}
                  onChange={(e) => setEditingSale({ ...editingSale, discount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  value={editingSale.total_amount}
                  disabled
                />
              </div>
              <div>
                <Label>Final Amount</Label>
                <Input
                  type="number"
                  value={editingSale.total_amount - editingSale.discount}
                  disabled
                />
              </div>
              <Button onClick={handleUpdateSale} className="w-full">
                Update Sale
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
