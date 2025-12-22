import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, CreditCard, CalendarIcon, RefreshCw, Eye, EyeOff, Crown, WifiOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineDashboard } from "@/hooks/useOfflineDashboard";
import MiniSparkline from "@/components/dashboard/MiniSparkline";
import SalesAreaChart from "@/components/dashboard/SalesAreaChart";
import WeeklyBarChart from "@/components/dashboard/WeeklyBarChart";
import DonutChart from "@/components/dashboard/DonutChart";
import TopProductsList from "@/components/dashboard/TopProductsList";
import TopCustomersList from "@/components/dashboard/TopCustomersList";
import UpgradePlanPopup from "@/components/billing/UpgradePlanPopup";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { Badge } from "@/components/ui/badge";

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
  const { isOnline, pendingCount } = useOffline();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // Use offline dashboard hook for IndexedDB-based calculations
  const {
    stats: offlineStats,
    topProducts: offlineTopProducts,
    topCustomers: offlineTopCustomers,
    categoryData: offlineCategoryData,
    weeklyData: offlineWeeklyData,
    isLoading: offlineLoading,
    refetch: refetchOffline,
  } = useOfflineDashboard(dateRange, startDate, endDate);
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [valuesHidden, setValuesHidden] = useState(() => {
    const saved = localStorage.getItem("dashboardValuesHidden");
    return saved === "true";
  });
  const [isPlanExpired, setIsPlanExpired] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // When offline, use offline data
  useEffect(() => {
    if (!isOnline) {
      setStats({
        totalSales: offlineStats.totalSales,
        totalProfit: offlineStats.totalProfit,
        totalCredit: offlineStats.totalCredit,
        todaySales: offlineStats.todaySales,
        totalCost: offlineStats.totalCost,
        totalPrice: 0,
      });
      setTopProducts(offlineTopProducts);
      setTopCustomers(offlineTopCustomers.map(c => ({ ...c, profit: 0 })));
      setCategoryData(offlineCategoryData);
      setWeeklyData(offlineWeeklyData);
    }
  }, [isOnline, offlineStats, offlineTopProducts, offlineTopCustomers, offlineCategoryData, offlineWeeklyData]);

  // Real-time sync for dashboard data (only when online)
  useEffect(() => {
    if (isOnline) {
      handleRefresh();
      checkSubscriptionStatus();
    }

    // Subscribe to real-time changes only when online
    if (!isOnline) return;
    
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

  // Get today's date range in user's timezone (for todaySales)
  const getTodayDateRange = () => {
    const now = new Date();
    const tz = timezone || 'Asia/Karachi';
    const tzOffset = getTimezoneOffsetMs(tz);
    const todayParts = getDatePartsInTimezone(now, tz);
    
    // Use Date.UTC to create UTC midnight, then subtract timezone offset
    const createStartOfDay = (year: number, month: number, day: number) => {
      const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);
      return new Date(utcMidnight - tzOffset);
    };

    const createEndOfDay = (year: number, month: number, day: number) => {
      const utcEndOfDay = Date.UTC(year, month, day, 23, 59, 59, 999);
      return new Date(utcEndOfDay - tzOffset);
    };

    return {
      start: createStartOfDay(todayParts.year, todayParts.month, todayParts.day),
      end: createEndOfDay(todayParts.year, todayParts.month, todayParts.day)
    };
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const tz = timezone || 'Asia/Karachi';
    const tzOffset = getTimezoneOffsetMs(tz);
    const todayParts = getDatePartsInTimezone(now, tz);
    
    let start: Date;
    let end: Date;

    // Use Date.UTC to create UTC midnight, then subtract timezone offset to get correct UTC time
    const createStartOfDay = (year: number, month: number, day: number) => {
      const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);
      return new Date(utcMidnight - tzOffset);
    };

    // Use Date.UTC to create UTC end of day, then subtract timezone offset
    const createEndOfDay = (year: number, month: number, day: number) => {
      const utcEndOfDay = Date.UTC(year, month, day, 23, 59, 59, 999);
      return new Date(utcEndOfDay - tzOffset);
    };

    switch (dateRange) {
      case "today":
        start = createStartOfDay(todayParts.year, todayParts.month, todayParts.day);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        break;
      case "yesterday":
        const yesterdayDate = new Date(todayParts.year, todayParts.month, todayParts.day - 1);
        const yesterdayParts = { year: yesterdayDate.getFullYear(), month: yesterdayDate.getMonth(), day: yesterdayDate.getDate() };
        start = createStartOfDay(yesterdayParts.year, yesterdayParts.month, yesterdayParts.day);
        end = createEndOfDay(yesterdayParts.year, yesterdayParts.month, yesterdayParts.day);
        break;
      case "1week":
        const weekAgoDate = new Date(todayParts.year, todayParts.month, todayParts.day - 7);
        const weekAgoParts = { year: weekAgoDate.getFullYear(), month: weekAgoDate.getMonth(), day: weekAgoDate.getDate() };
        start = createStartOfDay(weekAgoParts.year, weekAgoParts.month, weekAgoParts.day);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        break;
      case "1month":
        const monthAgoDate = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
        const monthAgoParts = { year: monthAgoDate.getFullYear(), month: monthAgoDate.getMonth(), day: monthAgoDate.getDate() };
        start = createStartOfDay(monthAgoParts.year, monthAgoParts.month, monthAgoParts.day);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        break;
      case "1year":
        const yearAgoDate = new Date(todayParts.year - 1, todayParts.month, todayParts.day);
        const yearAgoParts = { year: yearAgoDate.getFullYear(), month: yearAgoDate.getMonth(), day: yearAgoDate.getDate() };
        start = createStartOfDay(yearAgoParts.year, yearAgoParts.month, yearAgoParts.day);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        break;
      case "grand":
        start = new Date(0);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        break;
      case "custom":
        if (startDate) {
          start = createStartOfDay(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        } else {
          start = new Date(0);
        }
        if (endDate) {
          end = createEndOfDay(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        } else {
          end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
        }
        break;
      default:
        start = createStartOfDay(todayParts.year, todayParts.month, todayParts.day);
        end = createEndOfDay(todayParts.year, todayParts.month, todayParts.day);
    }

    return { start, end };
  };

  const fetchDashboardStats = async () => {
    const { start, end } = getDateRangeFilter();

    const { data: sales } = await supabase
      .from("sales")
      .select("id, final_amount")
      .is("deleted_at", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;
    
    const saleIds = sales?.map(sale => sale.id) || [];

    // Use timezone-aware today calculation for todaySales (always "today" regardless of selected dateRange)
    const todayRange = getTodayDateRange();
    const { data: todaySalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .is("deleted_at", null)
      .gte("created_at", todayRange.start.toISOString())
      .lte("created_at", todayRange.end.toISOString());
    const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.final_amount), 0) || 0;

    let totalProfit = 0;
    let totalCost = 0;
    let totalPrice = 0;
    
    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("profit, purchase_price, quantity, unit_price, is_return, is_deleted")
        .in("sale_id", saleIds)
        .eq("is_deleted", false);
      
      // Filter out return items - they are tracking only
      const regularItems = saleItems?.filter(item => !item.is_return) || [];
      
      totalProfit = regularItems.reduce((sum, item) => sum + Number(item.profit), 0);
      totalCost = regularItems.reduce((sum, item) => sum + (Number(item.purchase_price) * Number(item.quantity)), 0);
      totalPrice = regularItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
    }

    // Fetch credits filtered by selected date range
    // 1. Unpaid/partial invoices from sales table within date range
    const { data: salesCredits } = await supabase
      .from("sales")
      .select("final_amount, paid_amount")
      .not("customer_name", "is", null)
      .neq("payment_status", "paid")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    const salesCreditTotal = salesCredits?.reduce((sum, sale) => {
      const remaining = Number(sale.final_amount) - Number(sale.paid_amount || 0);
      return remaining > 0 ? sum + remaining : sum;
    }, 0) || 0;

    // 2. Cash credits from credits table within date range
    const { data: cashCredits } = await supabase
      .from("credits")
      .select("remaining_amount")
      .eq("credit_type", "cash")
      .gt("remaining_amount", 0)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    const cashCreditTotal = cashCredits?.reduce((sum, credit) => sum + Number(credit.remaining_amount), 0) || 0;

    const totalCredit = salesCreditTotal + cashCreditTotal;

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
      .is("deleted_at", null)
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
    
    // Fetch credits filtered by date range for sparkline
    const { data: salesCreditsForSparkline } = await supabase
      .from("sales")
      .select("final_amount, paid_amount, created_at")
      .not("customer_name", "is", null)
      .neq("payment_status", "paid")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const { data: cashCreditsForSparkline } = await supabase
      .from("credits")
      .select("remaining_amount, created_at")
      .eq("credit_type", "cash")
      .gt("remaining_amount", 0)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    const creditByDate: { [key: string]: number } = {};
    salesCreditsForSparkline?.forEach(sale => {
      const remaining = Number(sale.final_amount) - Number(sale.paid_amount || 0);
      if (remaining > 0) {
        const date = new Date(sale.created_at!).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        creditByDate[date] = (creditByDate[date] || 0) + remaining;
      }
    });
    cashCreditsForSparkline?.forEach(credit => {
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
      .is("deleted_at", null)
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
      .is("deleted_at", null)
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
      .is("deleted_at", null)
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
          <AnimatedLogoLoader size="lg" showMessage message="Loading dashboard..." />
        </div>
      )}
      <div id="dashboard-content" className="space-y-6">
        {/* Offline Indicator */}
        {!isOnline && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-900">You're offline</p>
              <p className="text-sm text-orange-700">
                Dashboard showing offline data. {pendingCount > 0 && `${pendingCount} changes pending sync.`}
              </p>
            </div>
          </div>
        )}

        {/* Expired Plan Banner */}
        {isPlanExpired && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Your plan has expired</p>
                <p className="text-sm text-amber-700">Upgrade now to continue using all features</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowUpgradePopup(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Overview of your business performance</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            {isPlanExpired && (
              <Button 
                onClick={() => setShowUpgradePopup(true)}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
            <Button 
              onClick={toggleValuesVisibility} 
              variant="outline" 
              size="icon"
              title={valuesHidden ? "Show values" : "Hide values"}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit</CardTitle>
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
