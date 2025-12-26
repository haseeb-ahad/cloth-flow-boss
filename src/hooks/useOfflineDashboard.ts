// Offline-first hook for dashboard analytics
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { useTimezone } from '@/contexts/TimezoneContext';

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalCredit: number;
  todaySales: number;
  totalCost: number;
  totalExpenses: number;
  netProfit: number;
  lowStockItems: number;
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

const CATEGORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];

export function useOfflineDashboard(dateRange: string = 'today', startDate?: Date, endDate?: Date) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalCredit: 0,
    todaySales: 0,
    totalCost: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockItems: 0,
  });
  const [topProducts, setTopProducts] = useState<ProductSalesData[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { timezone } = useTimezone();

  // Helper function to get date range based on filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    const tz = timezone || 'Asia/Karachi';
    
    let start: Date;
    let end: Date = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case '1week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case '1month':
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case '1year':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'grand':
        start = new Date(0);
        break;
      case 'custom':
        start = startDate || new Date(0);
        end = endDate || new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }, [dateRange, startDate, endDate, timezone]);

  // Calculate dashboard metrics from offline data
  const calculateDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { start, end } = getDateRange();
      
      // Get today's range for todaySales
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Load all data from IndexedDB
      const [sales, saleItems, products, credits, expenses] = await Promise.all([
        offlineDb.getAll<any>('sales'),
        offlineDb.getAll<any>('sale_items'),
        offlineDb.getAll<any>('products'),
        offlineDb.getAll<any>('credits'),
        offlineDb.getAll<any>('expenses'),
      ]);

      // Filter sales by date range
      const filteredSales = sales.filter(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      });

      const saleIds = new Set(filteredSales.map(s => s.id));
      const filteredSaleItems = saleItems.filter(item => 
        saleIds.has(item.sale_id) && !item.is_return
      );

      // Calculate totals
      const totalSales = filteredSales.reduce((sum, sale) => 
        sum + Number(sale.final_amount || 0), 0
      );

      const totalProfit = filteredSaleItems.reduce((sum, item) => 
        sum + Number(item.profit || 0), 0
      );

      const totalCost = filteredSaleItems.reduce((sum, item) => 
        sum + (Number(item.purchase_price || 0) * Number(item.quantity || 0)), 0
      );

      // Today's sales
      const todaySalesData = sales.filter(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= todayStart && saleDate <= todayEnd;
      });
      const todaySales = todaySalesData.reduce((sum, sale) => 
        sum + Number(sale.final_amount || 0), 0
      );

      // Outstanding credits
      const totalCredit = credits.reduce((sum, credit) => {
        if (credit.remaining_amount > 0) {
          return sum + Number(credit.remaining_amount || 0);
        }
        return sum;
      }, 0);

      // Also check unpaid sales
      const salesCredit = filteredSales.reduce((sum, sale) => {
        if (sale.payment_status !== 'paid') {
          const remaining = Number(sale.final_amount || 0) - Number(sale.paid_amount || 0);
          return sum + Math.max(0, remaining);
        }
        return sum;
      }, 0);

      // Filter expenses by date range
      const filteredExpenses = expenses.filter(expense => {
        if (!expense.expense_date) return false;
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= start && expenseDate <= end;
      });
      const totalExpenses = filteredExpenses.reduce((sum, expense) => 
        sum + Number(expense.amount || 0), 0
      );

      // Low stock items (quantity < 10)
      const lowStockItems = products.filter(p => p.stock_quantity < 10).length;

      // Net profit
      const netProfit = totalProfit - totalExpenses;

      setStats({
        totalSales,
        totalProfit,
        totalCredit: totalCredit + salesCredit,
        todaySales,
        totalCost,
        totalExpenses,
        netProfit,
        lowStockItems,
      });

      // Calculate top products
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
      filteredSaleItems.forEach(item => {
        const key = item.product_name;
        if (!productSales[key]) {
          productSales[key] = { quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += Number(item.quantity || 0);
        productSales[key].revenue += Number(item.total_price || 0);
      });
      
      const topProductsList = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProductsList);

      // Calculate top customers
      const customerStats: { [key: string]: { totalSpent: number; orders: number } } = {};
      filteredSales.forEach(sale => {
        if (!sale.customer_name) return;
        const key = sale.customer_name;
        if (!customerStats[key]) {
          customerStats[key] = { totalSpent: 0, orders: 0 };
        }
        customerStats[key].totalSpent += Number(sale.final_amount || 0);
        customerStats[key].orders += 1;
      });
      
      const topCustomersList = Object.entries(customerStats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);
      setTopCustomers(topCustomersList);

      // Calculate category data
      const categoryStats: { [key: string]: number } = {};
      filteredSaleItems.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const category = product?.category || 'Uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + Number(item.total_price || 0);
      });
      
      const categoryList = Object.entries(categoryStats)
        .map(([name, value], index) => ({
          name,
          value,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);
      setCategoryData(categoryList);

      // Calculate weekly data
      const weeklyStats: { [key: string]: number } = {};
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        weeklyStats[dayName] = 0;
      }
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      
      sales.filter(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= weekAgo;
      }).forEach(sale => {
        const saleDate = new Date(sale.created_at);
        const dayName = days[saleDate.getDay()];
        if (weeklyStats[dayName] !== undefined) {
          weeklyStats[dayName] += Number(sale.final_amount || 0);
        }
      });
      
      const weeklyList = Object.entries(weeklyStats).map(([day, value]) => ({
        day,
        value,
      }));
      setWeeklyData(weeklyList);

    } catch (err) {
      console.error('Error calculating dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, getDateRange]);

  useEffect(() => {
    calculateDashboardData();
  }, [calculateDashboardData]);

  return {
    stats,
    topProducts,
    topCustomers,
    categoryData,
    weeklyData,
    isLoading,
    refetch: calculateDashboardData,
  };
}
