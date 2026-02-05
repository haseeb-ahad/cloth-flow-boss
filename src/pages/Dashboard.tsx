import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, CreditCard, CalendarIcon, RefreshCw, Eye, EyeOff, Crown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateRangeFilter, DateFilterValue, getDatePartsInTimezone, getTimezoneOffsetMs } from "@/hooks/useDateRangeFilter";
import MiniSparkline from "@/components/dashboard/MiniSparkline";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import WeeklyBarChart from "@/components/dashboard/WeeklyBarChart";
import DonutChart from "@/components/dashboard/DonutChart";
import TopProductsList from "@/components/dashboard/TopProductsList";
import TopCustomersList from "@/components/dashboard/TopCustomersList";
import UpgradePlanPopup from "@/components/billing/UpgradePlanPopup";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalCredit: number;
  todaySales: number;
  totalCost: number;
  totalPrice: number;
  creditGiven: number;
  creditTaken: number;
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
  profit: number;
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
  const { timezone } = useTimezone();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalCredit: 0,
    todaySales: 0,
    totalCost: 0,
    totalPrice: 0,
    creditGiven: 0,
    creditTaken: 0,
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
  const [dateRange, setDateRange] = useState<DateFilterValue>("today");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [valuesHidden, setValuesHidden] = useState(() => {
    const saved = localStorage.getItem("dashboardValuesHidden");
    return saved === "true";
  });
  const [isPlanExpired, setIsPlanExpired] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // Real-time sync for dashboard data
  useEffect(() => {
    handleRefresh();
    checkSubscriptionStatus();

    // Subscribe to real-time changes
    const salesChannel = supabase
      .channel('dashboard-sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => handleRefresh()
      )
      .subscribe();

    const creditsChannel = supabase
      .channel('dashboard-credits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credits' },
        () => handleRefresh()
      )
      .subscribe();

    const productsChannel = supabase
      .channel('dashboard-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => handleRefresh()
      )
      .subscribe();

    const saleItemsChannel = supabase
      .channel('dashboard-sale-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => handleRefresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(saleItemsChannel);
    };
  }, [dateRange, startDate, endDate]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    try {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, end_date")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!subscription) {
        setIsPlanExpired(true);
        return;
      }
      
      const isExpired = subscription.status === "expired" || 
        (subscription.end_date && new Date(subscription.end_date) < new Date());
      setIsPlanExpired(isExpired);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

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

  // Use the centralized date range filter hook
  const { dateRange: computedDateRange, todayRange, timezone: tz } = useDateRangeFilter(dateRange, startDate, endDate);

  const getDateRangeFilter = () => computedDateRange;
  const getTodayDateRange = () => todayRange;

  const fetchDashboardStats = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: sales } = await supabase
      .from("sales")
      .select("id, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;
    
    const saleIds = sales?.map(sale => sale.id) || [];

    // Use timezone-aware today calculation for todaySales (always "today" regardless of selected dateRange)
    const todayRange = getTodayDateRange();
    const { data: todaySalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .gte("created_at", todayRange.start.toISOString())
      .lte("created_at", todayRange.end.toISOString());
    const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    let totalProfit = 0;
    let totalCost = 0;
    let totalPrice = 0;
    
    if (saleIds.length > 0) {
      // Fetch sale items
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("profit, purchase_price, quantity, unit_price, is_return, sale_id")
        .in("sale_id", saleIds);
      
      // Fetch discounts for each sale
      const { data: salesWithDiscount } = await supabase
        .from("sales")
        .select("id, discount")
        .in("id", saleIds);
      
      const discountMap: { [key: string]: number } = {};
      salesWithDiscount?.forEach(sale => {
        discountMap[sale.id] = sale.discount || 0;
      });
      
      // Filter out return items - they are tracking only
      const regularItems = saleItems?.filter(item => !item.is_return) || [];
      
      // Calculate raw profit from items
      const rawProfit = regularItems.reduce((sum, item) => sum + Number(item.profit), 0);
      
      // Calculate total discount
      const totalDiscount = salesWithDiscount?.reduce((sum, sale) => sum + (sale.discount || 0), 0) || 0;
      
      // Profit = Raw Profit - Discount
      totalProfit = rawProfit - totalDiscount;
      totalCost = regularItems.reduce((sum, item) => sum + (Number(item.purchase_price) * Number(item.quantity)), 0);
      totalPrice = regularItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
    }

    // Fetch credits filtered by selected date range
    // Calculate credit directly from sales remaining amounts (final_amount - paid_amount)
    const { data: salesWithRemaining } = await supabase
      .from("sales")
      .select("final_amount, paid_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    // Credit card shows remaining from sales (final_amount - paid_amount) where remaining > 0
    const totalCredit = salesWithRemaining?.reduce((sum, sale) => {
      const remaining = Number(sale.final_amount) - Number(sale.paid_amount || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0) || 0;
    
    // Fetch credit given/taken from credits table for Credit Summary card
    const { data: allCredits } = await supabase
      .from("credits")
      .select("remaining_amount, credit_type")
      .gt("remaining_amount", 0)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    // Fetch Credit Given (money to receive) - credit_type = 'given'
    const creditGiven = allCredits
      ?.filter(c => c.credit_type === "given")
      .reduce((sum, credit) => sum + Number(credit.remaining_amount), 0) || 0;
    
    // Fetch Credit Taken (money to pay) - credit_type = 'taken'
    const creditTaken = allCredits
      ?.filter(c => c.credit_type === "taken")
      .reduce((sum, credit) => sum + Number(credit.remaining_amount), 0) || 0;

    setStats({
      totalSales,
      totalProfit,
      totalCredit,
      todaySales,
      totalCost,
      totalPrice,
      creditGiven,
      creditTaken,
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
        .select("profit, sale_id, is_return")
        .in("sale_id", saleIds);
      // Filter out return items
      saleItems = data?.filter(item => !item.is_return) || [];
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
    
    // Fetch all credits for sparkline (includes invoice, given, cash types)
    const { data: creditsForSparkline } = await supabase
      .from("credits")
      .select("remaining_amount, created_at")
      .gt("remaining_amount", 0)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const creditByDate: { [key: string]: number } = {};
    creditsForSparkline?.forEach(credit => {
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
    const tz = timezone || 'Asia/Karachi';
    const now = new Date();
    const todayParts = getDatePartsInTimezone(now, tz);
    const tzOffset = getTimezoneOffsetMs(tz);
    
    // Calculate week start in user's timezone
    const weekStartDate = new Date(todayParts.year, todayParts.month, todayParts.day - 6);
    const weekStartLocal = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate(), 0, 0, 0, 0);
    const weekStartUTC = new Date(weekStartLocal.getTime() - tzOffset);
    
    const { data: sales } = await supabase
      .from("sales")
      .select("created_at, final_amount")
      .gte("created_at", weekStartUTC.toISOString())
      .order("created_at", { ascending: true });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataByDay: { [key: string]: number } = {};
    
    // Initialize all days with 0 based on timezone
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(weekStartDate.getDate() + i);
      dataByDay[days[d.getDay()]] = 0;
    }

    // Group sales by day in user's timezone
    sales?.forEach((sale) => {
      const saleDate = new Date(sale.created_at!);
      const saleParts = getDatePartsInTimezone(saleDate, tz);
      const saleLocalDate = new Date(saleParts.year, saleParts.month, saleParts.day);
      const day = days[saleLocalDate.getDay()];
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
        .select("product_name, quantity, total_price, is_return")
        .in("sale_id", saleIds);
      // Filter out return items
      saleItems = data?.filter(item => !item.is_return) || [];
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
      .select("id, customer_name, final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .not("customer_name", "is", null);

    if (!sales || sales.length === 0) {
      setTopCustomers([]);
      return;
    }

    // Fetch sale items for profit calculation
    const saleIds = sales.map(s => s.id);
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("sale_id, profit, is_return")
      .in("sale_id", saleIds);

    // Filter out return items and map sale_id to profit
    const regularItems = saleItems?.filter(item => !item.is_return) || [];
    const saleProfitMap: { [key: string]: number } = {};
    regularItems.forEach((item) => {
      if (!saleProfitMap[item.sale_id]) {
        saleProfitMap[item.sale_id] = 0;
      }
      saleProfitMap[item.sale_id] += Number(item.profit);
    });

    const customerMap: { [key: string]: { totalSpent: number; orders: number; profit: number } } = {};
    
    sales.forEach((sale) => {
      const name = sale.customer_name || "Anonymous";
      if (!customerMap[name]) {
        customerMap[name] = { totalSpent: 0, orders: 0, profit: 0 };
      }
      customerMap[name].totalSpent += Number(sale.final_amount);
      customerMap[name].orders += 1;
      customerMap[name].profit += saleProfitMap[sale.id] || 0;
    });

    const topCustomersData = Object.entries(customerMap)
      .map(([name, data]) => ({
        name,
        totalSpent: data.totalSpent,
        orders: data.orders,
        profit: data.profit,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    setTopCustomers(topCustomersData);
  };

  const fetchCategoryData = async () => {
    const { start, end } = getDateRangeFilter();

    // Get sales within date range
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const saleIds = sales?.map(sale => sale.id) || [];

    if (saleIds.length === 0) {
      setCategoryData([]);
      return;
    }

    // Get sale items for these sales (filter out returns)
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("product_id, total_price, is_return")
      .in("sale_id", saleIds);

    const regularItems = saleItems?.filter(item => !item.is_return) || [];

    if (regularItems.length === 0) {
      setCategoryData([]);
      return;
    }

    // Get product categories
    const productIds = [...new Set(regularItems.map(item => item.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, category")
      .in("id", productIds);

    const productCategoryMap: { [key: string]: string } = {};
    products?.forEach(product => {
      productCategoryMap[product.id] = product.category || "Uncategorized";
    });

    // Calculate sales by category
    const categoryMap: { [key: string]: number } = {};
    regularItems.forEach((item) => {
      const category = productCategoryMap[item.product_id] || "Uncategorized";
      categoryMap[category] = (categoryMap[category] || 0) + Number(item.total_price);
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
      case "today": return t("today");
      case "yesterday": return t("yesterday");
      case "1week": return t("thisWeek");
      case "1month": return t("thisMonth");
      case "1year": return t("oneYear");
      case "grand": return t("allTime");
      case "custom": return startDate && endDate ? `${format(startDate, "PP")} - ${format(endDate, "PP")}` : t("customRange");
      default: return t("today");
    }
  };

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-4 md:py-6 space-y-4 md:space-y-6 overflow-x-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message={t("loading")} />
        </div>
      )}
      <div id="dashboard-content" className="space-y-6">
        {/* Expired Plan Banner */}
        {isPlanExpired && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">{t("planExpired")}</p>
                <p className="text-sm text-amber-700">{t("upgradeContinue")}</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowUpgradePopup(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              {t("upgradePlan")}
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("overviewPerformance")}</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            {isPlanExpired && (
              <Button 
                onClick={() => setShowUpgradePopup(true)}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                {t("upgradePlan")}
              </Button>
            )}
            <Button 
              onClick={toggleValuesVisibility} 
              variant="outline" 
              size="icon"
              title={valuesHidden ? t("showValues") : t("hideValues")}
              className="hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent transition-all shrink-0"
            >
              {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="icon"
              disabled={isLoading}
              className="hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent transition-all shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateFilterValue)} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("selectRange")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t("today")}</SelectItem>
                <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
                <SelectItem value="1week">{t("oneWeek")}</SelectItem>
                <SelectItem value="1month">{t("oneMonth")}</SelectItem>
                <SelectItem value="1year">{t("oneYear")}</SelectItem>
                <SelectItem value="grand">{t("grandReport")}</SelectItem>
                <SelectItem value="custom">{t("custom")}</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full sm:w-[140px]", !startDate && "text-muted-foreground")} disabled={isLoading}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">{startDate ? format(startDate, "PP") : t("startDate")}</span>
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
                      <span className="truncate">{endDate ? format(endDate, "PP") : t("endDate")}</span>
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
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("sale")}</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stats.totalSales)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.sales} color="#3b82f6" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("profit")}</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-500 tracking-tight">{formatCurrency(stats.totalProfit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.profit} color="#8b5cf6" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("credit")}</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-500 tracking-tight">{formatCurrency(stats.totalCredit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
                </div>
                <MiniSparkline data={sparklineData.credit} color="#6366f1" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-in group" style={{ animationDelay: '250ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Summary</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-3">
                {/* Credit Given */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Given</p>
                      <p className="text-[10px] text-muted-foreground/70">Money to receive</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-500 tracking-tight">{formatCurrency(stats.creditGiven)}</div>
                </div>
                
                <div className="border-t border-border/50" />
                
                {/* Credit Taken */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                      <ArrowUpCircle className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taken</p>
                      <p className="text-[10px] text-muted-foreground/70">Money to pay</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-rose-500 tracking-tight">{formatCurrency(stats.creditTaken)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 - Weekly Analytics (2/3) + Category Pie (1/3) */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 w-full">
          <div className="lg:col-span-2">
            <WeeklyBarChart
              data={weeklyData}
              title={t("weeklyAnalytics")}
              subtitle={t("salesByDay")}
              valuesHidden={valuesHidden}
            />
          </div>
          <DonutChart
            data={categoryData}
            title={t("salesByCategory")}
            subtitle={t("distributionCategories")}
            valuesHidden={valuesHidden}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row 2 - Products + Customers */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 w-full">
          <TopProductsList
            data={topProducts}
            title={t("topSellingProducts")}
            subtitle={t("bestPerformers")}
            valuesHidden={valuesHidden}
          />
          <TopCustomersList
            data={topCustomers}
            title={t("topCustomers")}
            subtitle={t("customerActivity")}
            valuesHidden={valuesHidden}
          />
        </div>
      </div>

      {/* Upgrade Plan Popup */}
      <UpgradePlanPopup 
        open={showUpgradePopup} 
        onOpenChange={setShowUpgradePopup}
        onSuccess={checkSubscriptionStatus}
      />
    </div>
  );
};

export default Dashboard;
