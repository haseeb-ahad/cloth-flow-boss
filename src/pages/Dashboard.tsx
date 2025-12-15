import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, CreditCard, CalendarIcon, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MiniSparkline from "@/components/dashboard/MiniSparkline";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import WeeklyBarChart from "@/components/dashboard/WeeklyBarChart";
import DonutChart from "@/components/dashboard/DonutChart";
import TopProductsList from "@/components/dashboard/TopProductsList";
import TopCustomersList from "@/components/dashboard/TopCustomersList";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalCredit: number;
  todaySales: number;
  totalCost: number;
  totalPrice: number;
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

interface CustomerData {
  name: string;
  totalSpent: number;
  orders: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface WeeklyData {
  day: string;
  value: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalCredit: 0,
    todaySales: 0,
    totalCost: 0,
    totalPrice: 0,
  });
  const [salesChartData, setSalesChartData] = useState<ChartData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSalesData[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [sparklineData, setSparklineData] = useState<{
    sales: { value: number }[];
    profit: { value: number }[];
    credit: { value: number }[];
  }>({ sales: [], profit: [], credit: [] });
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [valuesHidden, setValuesHidden] = useState(() => {
    const saved = localStorage.getItem("dashboardValuesHidden");
    return saved === "true";
  });

  useEffect(() => {
    handleRefresh();
  }, [dateRange, startDate, endDate]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDashboardStats(), 
      fetchChartData(), 
      fetchTopProducts(),
      fetchTopCustomers(),
      fetchCategoryData(),
      fetchWeeklyData(),
    ]);
    setIsLoading(false);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case "today":
        const todayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(Date.UTC(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate(), 23, 59, 59, 999));
        break;
      case "yesterday":
        const yesterdayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start = new Date(Date.UTC(yesterdayUTC.getFullYear(), yesterdayUTC.getMonth(), yesterdayUTC.getDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(yesterdayUTC.getFullYear(), yesterdayUTC.getMonth(), yesterdayUTC.getDate(), 23, 59, 59, 999));
        break;
      case "1week":
        const weekAgoUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        start = new Date(Date.UTC(weekAgoUTC.getFullYear(), weekAgoUTC.getMonth(), weekAgoUTC.getDate(), 0, 0, 0, 0));
        const todayEndUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(Date.UTC(todayEndUTC.getFullYear(), todayEndUTC.getMonth(), todayEndUTC.getDate(), 23, 59, 59, 999));
        break;
      case "1month":
        const monthAgoUTC = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        start = new Date(Date.UTC(monthAgoUTC.getFullYear(), monthAgoUTC.getMonth(), monthAgoUTC.getDate(), 0, 0, 0, 0));
        const monthEndUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(Date.UTC(monthEndUTC.getFullYear(), monthEndUTC.getMonth(), monthEndUTC.getDate(), 23, 59, 59, 999));
        break;
      case "1year":
        const yearAgoUTC = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        start = new Date(Date.UTC(yearAgoUTC.getFullYear(), yearAgoUTC.getMonth(), yearAgoUTC.getDate(), 0, 0, 0, 0));
        const yearEndUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(Date.UTC(yearEndUTC.getFullYear(), yearEndUTC.getMonth(), yearEndUTC.getDate(), 23, 59, 59, 999));
        break;
      case "grand":
        start = new Date(0);
        const grandEndUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(Date.UTC(grandEndUTC.getFullYear(), grandEndUTC.getMonth(), grandEndUTC.getDate(), 23, 59, 59, 999));
        break;
      case "custom":
        if (startDate) {
          start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0));
        } else {
          start = new Date(0);
        }
        if (endDate) {
          end = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));
        } else {
          const customEndUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(Date.UTC(customEndUTC.getFullYear(), customEndUTC.getMonth(), customEndUTC.getDate(), 23, 59, 59, 999));
        }
        break;
      default:
        const defaultTodayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(Date.UTC(defaultTodayUTC.getFullYear(), defaultTodayUTC.getMonth(), defaultTodayUTC.getDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(defaultTodayUTC.getFullYear(), defaultTodayUTC.getMonth(), defaultTodayUTC.getDate(), 23, 59, 59, 999));
    }

    return { start, end };
  };

  const fetchDashboardStats = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: sales } = await supabase
      .from("sales")
      .select("id, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;
    
    const saleIds = sales?.map(sale => sale.id) || [];

    const today = new Date().toISOString().split('T')[0];
    const { data: todaySalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", today);
    const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    let totalProfit = 0;
    let totalCost = 0;
    let totalPrice = 0;
    
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("profit, purchase_price, quantity, unit_price")
        .in("sale_id", saleIds);
      
      totalProfit = saleItems?.reduce((sum, item) => sum + Number(item.profit), 0) || 0;
      totalCost = saleItems?.reduce((sum, item) => sum + (Number(item.purchase_price) * item.quantity), 0) || 0;
      totalPrice = saleItems?.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0) || 0;
    }

    const { data: credits } = await supabase
      .from("credits")
      .select("remaining_amount, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const totalCredit = credits?.reduce((sum, credit) => sum + Number(credit.remaining_amount), 0) || 0;

    setStats({
      totalSales,
      totalProfit,
      totalCredit,
      todaySales,
      totalCost,
      totalPrice,
    });
  };

  const fetchChartData = async () => {
    const { start, end } = getDateRangeFilter();
    
    const { data: sales } = await supabase
      .from("sales")
      .select("id, created_at, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const saleIds = sales?.map(sale => sale.id) || [];
    const saleDateMap: { [key: string]: string } = {};
    sales?.forEach(sale => {
      saleDateMap[sale.id] = new Date(sale.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
    });

    let saleItems: any[] = [];
    if (saleIds.length > 0) {
      const { data } = await supabase
        .from("sale_items")
        .select("profit, sale_id")
        .in("sale_id", saleIds);
      saleItems = data || [];
    }

    const dataByDate: { [key: string]: { sales: number; profit: number } } = {};
    
    sales?.forEach((sale) => {
      const date = new Date(sale.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      if (!dataByDate[date]) {
        dataByDate[date] = { sales: 0, profit: 0 };
      }
      dataByDate[date].sales += Number(sale.final_amount);
    });

    saleItems?.forEach((item) => {
      const date = saleDateMap[item.sale_id];
      if (date && dataByDate[date]) {
        dataByDate[date].profit += Number(item.profit);
      }
    });

    const chartData = Object.entries(dataByDate).map(([date, data]) => ({
      date,
      sales: data.sales,
      profit: data.profit,
    }));

    setSalesChartData(chartData);

    // Generate sparkline data from chart data
    const salesSparkline = chartData.map(d => ({ value: d.sales }));
    const profitSparkline = chartData.map(d => ({ value: d.profit }));
    
    // Fetch credit data for sparkline
    const { data: credits } = await supabase
      .from("credits")
      .select("remaining_amount, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const creditByDate: { [key: string]: number } = {};
    credits?.forEach(credit => {
      const date = new Date(credit.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      creditByDate[date] = (creditByDate[date] || 0) + Number(credit.remaining_amount);
    });
    const creditSparkline = Object.values(creditByDate).map(v => ({ value: v }));

    setSparklineData({
      sales: salesSparkline,
      profit: profitSparkline,
      credit: creditSparkline,
    });
  };

  const fetchWeeklyData = async () => {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    
    const { data: sales } = await supabase
      .from("sales")
      .select("created_at, final_amount")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: true });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataByDay: { [key: string]: number } = {};
    
    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekAgo);
      d.setDate(weekAgo.getDate() + i);
      dataByDay[days[d.getDay()]] = 0;
    }

    sales?.forEach((sale) => {
      const day = days[new Date(sale.created_at!).getDay()];
      dataByDay[day] = (dataByDay[day] || 0) + Number(sale.final_amount);
    });

    const weekly = Object.entries(dataByDay).map(([day, value]) => ({
      day,
      value,
    }));

    setWeeklyData(weekly);
  };

  const fetchTopProducts = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const saleIds = sales?.map(sale => sale.id) || [];

    let saleItems: any[] = [];
    if (saleIds.length > 0) {
      const { data } = await supabase
        .from("sale_items")
        .select("product_name, quantity, total_price")
        .in("sale_id", saleIds);
      saleItems = data || [];
    }

    if (!saleItems || saleItems.length === 0) {
      setTopProducts([]);
      return;
    }

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

  const fetchTopCustomers = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: sales } = await supabase
      .from("sales")
      .select("customer_name, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .not("customer_name", "is", null);

    if (!sales || sales.length === 0) {
      setTopCustomers([]);
      return;
    }

    const customerMap: { [key: string]: { totalSpent: number; orders: number } } = {};
    
    sales.forEach((sale) => {
      const name = sale.customer_name || "Anonymous";
      if (!customerMap[name]) {
        customerMap[name] = { totalSpent: 0, orders: 0 };
      }
      customerMap[name].totalSpent += Number(sale.final_amount);
      customerMap[name].orders += 1;
    });

    const topCustomersData = Object.entries(customerMap)
      .map(([name, data]) => ({
        name,
        totalSpent: data.totalSpent,
        orders: data.orders,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    setTopCustomers(topCustomersData);
  };

  const fetchCategoryData = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("category")
      .is("deleted_at", null);

    if (!products || products.length === 0) {
      setCategoryData([]);
      return;
    }

    const categoryMap: { [key: string]: number } = {};
    
    products.forEach((product) => {
      const category = product.category || "Uncategorized";
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    const categoryChartData = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        color: "",
      }))
      .sort((a, b) => b.value - a.value);

    setCategoryData(categoryChartData);
  };

  const formatCurrency = (amount: number) => {
    if (valuesHidden) return "••••••";
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const toggleValuesVisibility = () => {
    const newValue = !valuesHidden;
    setValuesHidden(newValue);
    localStorage.setItem("dashboardValuesHidden", newValue.toString());
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "1week": return "This Week";
      case "1month": return "This Month";
      case "1year": return "This Year";
      case "grand": return "All Time";
      case "custom": return startDate && endDate ? `${format(startDate, "PP")} - ${format(endDate, "PP")}` : "Custom Range";
      default: return "Today";
    }
  };

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-muted-foreground text-lg">Loading dashboard...</p>
          </div>
        </div>
      )}
      <div id="dashboard-content" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Overview of your business performance</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <Button 
              onClick={toggleValuesVisibility} 
              variant="outline" 
              size="icon"
              title={valuesHidden ? "Show values" : "Hide values"}
              className="hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors shrink-0"
            >
              {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="icon"
              disabled={isLoading}
              className="hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Select value={dateRange} onValueChange={setDateRange} disabled={isLoading}>
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
                    <Button variant="outline" className={cn("w-full sm:w-[140px]", !startDate && "text-muted-foreground")} disabled={isLoading}>
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
                    <Button variant="outline" className={cn("w-full sm:w-[140px]", !endDate && "text-muted-foreground")} disabled={isLoading}>
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

        {/* KPI Cards with Mini Sparklines */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr w-full">
          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sale</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalSales)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.sales} color="#10b981" id="sales" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-tight">{formatCurrency(stats.totalProfit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.profit} color="#34d399" id="profit" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-500 tracking-tight">{formatCurrency(stats.totalCredit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.credit} color="#f97316" id="credit" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 - Weekly Analytics (2/3) + Category Pie (1/3) */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 w-full">
          <div className="lg:col-span-2">
            <WeeklyBarChart
              data={weeklyData}
              title="Weekly Analytics"
              subtitle="Sales performance by day"
              valuesHidden={valuesHidden}
            />
          </div>
          <DonutChart
            data={categoryData}
            title="Sales by Category"
            subtitle="Distribution across categories"
            valuesHidden={valuesHidden}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row 2 - Products + Customers */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 w-full">
          <TopProductsList
            data={topProducts}
            title="Top Selling Products"
            subtitle="Best performers this period"
            valuesHidden={valuesHidden}
          />
          <TopCustomersList
            data={topCustomers}
            title="Top Customers"
            subtitle="Customer activity this period"
            valuesHidden={valuesHidden}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
