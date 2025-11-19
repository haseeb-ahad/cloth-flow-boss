import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  created_at: string;
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSales(data);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Sales;
