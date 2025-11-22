import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch, TrendingUp, CreditCard, DollarSign, ShoppingCart, CalendarIcon, RefreshCw, Download } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalInventoryValue: number;
  totalCredit: number;
  todaySales: number;
  lowStockCount: number;
  totalCost: number;
  totalPrice: number;
  totalStockValueWithProfit: number;
}

interface ChartData {
  date: string;
  sales: number;
  profit: number;
}

interface ProductSalesData {
  name: string;
  quantity: number;
  revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalInventoryValue: 0,
    totalCredit: 0,
    todaySales: 0,
    lowStockCount: 0,
    totalCost: 0,
    totalPrice: 0,
    totalStockValueWithProfit: 0,
  });
  const [salesChartData, setSalesChartData] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSalesData[]>([]);
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, [dateRange, startDate, endDate]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchDashboardStats(), fetchChartData(), fetchTopProducts()]);
    setIsLoading(false);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    let start = new Date();

    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case "1week":
        start.setDate(now.getDate() - 7);
        break;
      case "1month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "1year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "grand":
        start = new Date(0); // Beginning of time
        break;
      case "custom":
        if (startDate) start = startDate;
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    return { start, end: dateRange === "custom" && endDate ? endDate : now };
  };

  const fetchDashboardStats = async () => {
    const { start, end } = getDateRangeFilter();

    // Fetch sales data with date filter
    const { data: sales } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    // Fetch today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", today);
    const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    // Fetch profit data with date filter
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("profit, purchase_price, quantity, unit_price")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    const totalProfit = saleItems?.reduce((sum, item) => sum + Number(item.profit), 0) || 0;
    const totalCost = saleItems?.reduce((sum, item) => sum + (Number(item.purchase_price) * item.quantity), 0) || 0;
    const totalPrice = saleItems?.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0) || 0;

    // Fetch inventory value
    const { data: products } = await supabase.from("products").select("purchase_price, stock_quantity, selling_price");
    const totalInventoryValue = products?.reduce(
      (sum, product) => sum + Number(product.purchase_price) * product.stock_quantity,
      0
    ) || 0;
    
    const totalStockValueWithProfit = products?.reduce(
      (sum, product) => sum + Number(product.selling_price) * product.stock_quantity,
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
      totalCost,
      totalPrice,
      totalStockValueWithProfit,
    });
  };

  const fetchChartData = async () => {
    const { start, end } = getDateRangeFilter();
    
    const { data: sales } = await supabase
      .from("sales")
      .select("created_at, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("created_at, profit, sale_id")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    // Group by date
    const dataByDate: { [key: string]: { sales: number; profit: number } } = {};
    
    sales?.forEach((sale) => {
      const date = new Date(sale.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      if (!dataByDate[date]) {
        dataByDate[date] = { sales: 0, profit: 0 };
      }
      dataByDate[date].sales += Number(sale.final_amount);
    });

    saleItems?.forEach((item) => {
      const date = new Date(item.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      if (dataByDate[date]) {
        dataByDate[date].profit += Number(item.profit);
      }
    });

    const chartData = Object.entries(dataByDate).map(([date, data]) => ({
      date,
      sales: data.sales,
      profit: data.profit,
    }));

    setSalesChartData(chartData);
  };

  const fetchTopProducts = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("product_name, quantity, total_price")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (!saleItems) return;

    // Aggregate by product name
    const productMap: { [key: string]: { quantity: number; revenue: number } } = {};
    
    saleItems.forEach((item) => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { quantity: 0, revenue: 0 };
      }
      productMap[item.product_name].quantity += item.quantity;
      productMap[item.product_name].revenue += Number(item.total_price);
    });

    const topProductsData = Object.entries(productMap)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    setTopProducts(topProductsData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "1week": return "1 Week";
      case "1month": return "1 Month";
      case "1year": return "1 Year";
      case "grand": return "All Time (Grand Report)";
      case "custom": return startDate && endDate ? `${format(startDate, "PP")} - ${format(endDate, "PP")}` : "Custom Range";
      default: return "Today";
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF...");
      const dashboardElement = document.getElementById("dashboard-content");
      if (!dashboardElement) return;

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`dashboard-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Dashboard exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export dashboard");
    }
  };

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div id="dashboard-content" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Overview of your business performance</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <Button 
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="icon"
              disabled={isLoading}
              className="hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="1week">1 Week</SelectItem>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="grand">Grand Report</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          {dateRange === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[140px]", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{startDate ? format(startDate, "PP") : "Start Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[140px]", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{endDate ? format(endDate, "PP") : "End Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr w-full">
          <Card className="hover:shadow-lg transition-all duration-300 animate-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Total Sales</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">For selected period</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData.slice(-7)}>
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '50ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Today's Sales</CardTitle>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center ring-4 ring-accent/5">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.todaySales)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Sales made today</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData.slice(-7)}>
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Total Profit</CardTitle>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center ring-4 ring-success/5">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-success tracking-tight">{formatCurrency(stats.totalProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Net profit earned</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData.slice(-7)}>
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Total Cost</CardTitle>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center ring-4 ring-destructive/5">
                <PackageSearch className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalCost)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Purchase cost</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData.slice(-7)}>
                    <Bar dataKey="sales" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Total Revenue</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalPrice)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Selling price</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData.slice(-7)}>
                    <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '250ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Inventory Value</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                <PackageSearch className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Current stock value</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData.slice(-7)}>
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Pending Credits</CardTitle>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center ring-4 ring-warning/5">
                <CreditCard className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-warning tracking-tight">{formatCurrency(stats.totalCredit)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Outstanding payments</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData.slice(-7)}>
                    <Bar dataKey="sales" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '350ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Low Stock Items</CardTitle>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center ring-4 ring-destructive/5">
                <PackageSearch className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-destructive tracking-tight">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Items below 10 units</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData.slice(-7)}>
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide">Total Stock Value with Profit</CardTitle>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center ring-4 ring-success/5">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-success tracking-tight">{formatCurrency(stats.totalStockValueWithProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Potential selling value</p>
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData.slice(-7)}>
                    <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 w-full">
        <Card className="hover:shadow-xl transition-all duration-300 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sales & Profit Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground font-medium">{getDateRangeLabel()}</p>
          </CardHeader>
          <CardContent className="pb-6">
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color: "hsl(var(--primary))",
                },
                profit: {
                  label: "Profit",
                  color: "hsl(var(--success))",
                },
              }}
              className="h-[350px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={salesChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={5}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ 
                      fill: "hsl(var(--primary))", 
                      strokeWidth: 2, 
                      r: 4,
                      stroke: "hsl(var(--card))"
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: "hsl(var(--card))", 
                      strokeWidth: 2,
                      fill: "hsl(var(--primary))"
                    }}
                    fill="url(#colorSales)"
                    animationDuration={1000}
                    animationBegin={0}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={3}
                    dot={{ 
                      fill: "hsl(var(--success))", 
                      strokeWidth: 2, 
                      r: 4,
                      stroke: "hsl(var(--card))"
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: "hsl(var(--card))", 
                      strokeWidth: 2,
                      fill: "hsl(var(--success))"
                    }}
                    fill="url(#colorProfit)"
                    animationDuration={1000}
                    animationBegin={200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-accent" />
              All Products by Revenue ({topProducts.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground font-medium">{getDateRangeLabel()}</p>
          </CardHeader>
          <CardContent className="pb-6">
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--accent))",
                },
              }}
              className="h-[350px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topProducts}
                  margin={{ top: 10, right: 20, left: 0, bottom: 80 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1}/>
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#colorRevenue)"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                    animationBegin={0}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
