import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch, TrendingUp, CreditCard, DollarSign, ShoppingCart } from "lucide-react";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalInventoryValue: number;
  totalCredit: number;
  todaySales: number;
  lowStockCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalInventoryValue: 0,
    totalCredit: 0,
    todaySales: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    // Fetch sales data
    const { data: sales } = await supabase.from("sales").select("final_amount");
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    // Fetch today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", today);
    const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    // Fetch profit data
    const { data: saleItems } = await supabase.from("sale_items").select("profit");
    const totalProfit = saleItems?.reduce((sum, item) => sum + Number(item.profit), 0) || 0;

    // Fetch inventory value
    const { data: products } = await supabase.from("products").select("purchase_price, stock_quantity");
    const totalInventoryValue = products?.reduce(
      (sum, product) => sum + Number(product.purchase_price) * product.stock_quantity,
      0
    ) || 0;

    // Fetch credit data
    const { data: credits } = await supabase.from("credits").select("remaining_amount");
    const totalCredit = credits?.reduce((sum, credit) => sum + Number(credit.remaining_amount), 0) || 0;

    // Fetch low stock count
    const { data: lowStock } = await supabase
      .from("products")
      .select("id")
      .lt("stock_quantity", 10);
    const lowStockCount = lowStock?.length || 0;

    setStats({
      totalSales,
      totalProfit,
      totalInventoryValue,
      totalCredit,
      todaySales,
      lowStockCount,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.todaySales)}</div>
            <p className="text-xs text-muted-foreground">Sales made today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Net profit earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <PackageSearch className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalInventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Current stock value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Credit</CardTitle>
            <CreditCard className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(stats.totalCredit)}</div>
            <p className="text-xs text-muted-foreground">Outstanding payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <PackageSearch className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below 10 units</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
