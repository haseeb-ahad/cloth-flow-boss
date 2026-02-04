import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, TrendingUp, TrendingDown, DollarSign, Download, Upload, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportExpensesToCSV, parseExpensesCSV } from "@/lib/csvExport";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useDateRangeFilter, DateFilterValue, calculateDateRange, getDatePartsInTimezone, getTimezoneOffsetMs, createDateRangeUTC } from "@/hooks/useDateRangeFilter";
import { format } from "date-fns";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "1 Week", value: "1week" },
  { label: "1 Month", value: "1month" },
  { label: "1 Year", value: "1year" },
  { label: "Grand Report", value: "grand" },
  { label: "Custom", value: "custom" },
];

export default function Expenses() {
  const { user, ownerId, hasPermission, userRole } = useAuth();
  const { formatDate, formatDateInput } = useTimezone();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the centralized date range filter hook
  const { dateRange: computedDateRange, timezone: tz } = useDateRangeFilter(dateFilter, startDate, endDate);
  
  const [formData, setFormData] = useState({
    expense_type: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0]
  });

  // Real-time subscription for expenses and sales
  useEffect(() => {
    const expensesChannel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          // Invalidate all expense-related queries for real-time updates
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["filteredExpensesTotal"] });
          queryClient.invalidateQueries({ queryKey: ["previousExpenses"] });
          queryClient.invalidateQueries({ queryKey: ["allExpenseTypes"] });
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel('sales-realtime-expenses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          // Invalidate all profit-related queries for real-time updates
          queryClient.invalidateQueries({ queryKey: ["filteredProfit"] });
          queryClient.invalidateQueries({ queryKey: ["previousProfit"] });
        }
      )
      .subscribe();

    const saleItemsChannel = supabase
      .channel('sale-items-realtime-expenses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sale_items' },
        () => {
          // Invalidate all profit-related queries for real-time updates
          queryClient.invalidateQueries({ queryKey: ["filteredProfit"] });
          queryClient.invalidateQueries({ queryKey: ["previousProfit"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(saleItemsChannel);
    };
  }, [queryClient]);

  const handleExportCSV = () => {
    // Export the currently filtered expenses
    exportExpensesToCSV(expenses);
    toast.success(`Exported ${expenses.length} expenses`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      
      if (!text.trim()) {
        toast.error("The CSV file is empty");
        return;
      }

      const { expenses: parsedExpenses, errors, duplicateIds } = parseExpensesCSV(text);
      
      // Show validation errors if any
      if (errors.length > 0) {
        const errorSummary = errors.length <= 5 
          ? errors.join("\n") 
          : `${errors.slice(0, 5).join("\n")}\n...and ${errors.length - 5} more errors`;
        console.error("Import validation errors:", errors);
        toast.error(`Validation errors found:\n${errorSummary}`);
      }

      if (parsedExpenses.length === 0) {
        toast.error("No valid expenses found in CSV. Check that all rows have Date, Amount, and Type.");
        return;
      }

      // Check for duplicates in database if we have original IDs
      let existingIds: string[] = [];
      if (duplicateIds.length > 0) {
        const { data: existingExpenses } = await supabase
          .from("expenses")
          .select("id")
          .in("id", duplicateIds);
        
        existingIds = existingExpenses?.map(e => e.id) || [];
      }

      // Apply type filter to imported expenses if active
      const filteredParsedExpenses = typeFilter === "all" 
        ? parsedExpenses 
        : parsedExpenses.filter(exp => exp.expense_type === typeFilter);

      if (filteredParsedExpenses.length === 0) {
        toast.error(`No expenses matching type "${typeFilter}" found in CSV`);
        return;
      }

      let imported = 0;
      let skipped = 0;
      const importErrors: string[] = [];

      for (const expense of filteredParsedExpenses) {
        // Skip if this is a duplicate (original_id exists in database)
        if (expense.original_id && existingIds.includes(expense.original_id)) {
          skipped++;
          continue;
        }

        // Remove original_id before inserting (it's not a database column)
        const { original_id, ...expenseData } = expense;
        
        const { error } = await supabase.from("expenses").insert({
          ...expenseData,
          owner_id: ownerId,
        });
        
        if (error) {
          importErrors.push(`Failed to import expense: ${error.message}`);
        } else {
          imported++;
        }
      }

      // Log errors for admin review
      if (importErrors.length > 0) {
        console.error("Import errors:", importErrors);
      }

      // Show result summary
      let message = `Successfully imported ${imported} expenses`;
      if (skipped > 0) {
        message += ` (${skipped} duplicates skipped)`;
      }
      if (errors.length > 0) {
        message += ` (${errors.length} rows had validation errors)`;
      }
      
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["filteredExpensesTotal"] });
      queryClient.invalidateQueries({ queryKey: ["previousExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpenseTypes"] });
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import CSV. The file may be corrupted.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Use the centralized date range utility
  const getDateRange = () => computedDateRange;

  // Get previous period date range for comparison - timezone aware
  const getPreviousPeriodRange = () => {
    const now = new Date();
    const todayParts = getDatePartsInTimezone(now, tz);
    const tzOffset = getTimezoneOffsetMs(tz);
    
    switch (dateFilter) {
      case "today": {
        // Compare with yesterday
        const yesterday = new Date(todayParts.year, todayParts.month, todayParts.day - 1);
        return createDateRangeUTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), tzOffset);
      }
      case "yesterday": {
        // Compare with day before yesterday
        const dayBefore = new Date(todayParts.year, todayParts.month, todayParts.day - 2);
        return createDateRangeUTC(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), tzOffset);
      }
      case "1week": {
        // Compare with previous week
        const prevWeekStart = new Date(todayParts.year, todayParts.month, todayParts.day - 14);
        const prevWeekEnd = new Date(todayParts.year, todayParts.month, todayParts.day - 8);
        return createDateRangeUTC(prevWeekStart.getFullYear(), prevWeekStart.getMonth(), prevWeekStart.getDate(), prevWeekEnd.getFullYear(), prevWeekEnd.getMonth(), prevWeekEnd.getDate(), tzOffset);
      }
      case "1month": {
        // Compare with previous month
        const prevMonthStart = new Date(todayParts.year, todayParts.month - 2, todayParts.day);
        const prevMonthEnd = new Date(todayParts.year, todayParts.month - 1, todayParts.day - 1);
        return createDateRangeUTC(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), prevMonthStart.getDate(), prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), prevMonthEnd.getDate(), tzOffset);
      }
      case "1year": {
        // Compare with previous year
        const prevYearStart = new Date(todayParts.year - 2, todayParts.month, todayParts.day);
        const prevYearEnd = new Date(todayParts.year - 1, todayParts.month, todayParts.day - 1);
        return createDateRangeUTC(prevYearStart.getFullYear(), prevYearStart.getMonth(), prevYearStart.getDate(), prevYearEnd.getFullYear(), prevYearEnd.getMonth(), prevYearEnd.getDate(), tzOffset);
      }
      default: {
        // Default to yesterday for comparison
        const yesterday = new Date(todayParts.year, todayParts.month, todayParts.day - 1);
        return createDateRangeUTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), tzOffset);
      }
    }
  };

  const getDateRangeLabel = () => {
    switch (dateFilter) {
      case "all": return "All";
      case "today": return "Today's";
      case "yesterday": return "Yesterday's";
      case "1week": return "Weekly";
      case "1month": return "Monthly";
      case "1year": return "Yearly";
      case "grand": return "All Time";
      case "custom": return startDate && endDate ? `${format(startDate, "PP")} - ${format(endDate, "PP")}` : "Custom";
      default: return "All";
    }
  };

  const getComparisonLabel = () => {
    switch (dateFilter) {
      case "today": return "vs yesterday";
      case "yesterday": return "vs day before";
      case "1week": return "vs last week";
      case "1month": return "vs last month";
      case "1year": return "vs last year";
      default: return "";
    }
  };

  // Fetch all unique expense types for filter dropdown
  const { data: allExpenseTypes = [] } = useQuery({
    queryKey: ["allExpenseTypes", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("expense_type")
        .order("expense_type");
      
      if (error) throw error;
      const types = new Set<string>();
      data?.forEach(exp => {
        if (exp.expense_type) types.add(exp.expense_type);
      });
      return Array.from(types).sort();
    },
    enabled: !!ownerId
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", dateFilter, typeFilter, ownerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      
      const { start, end } = getDateRange();
      query = query.gte("expense_date", start.toISOString().split('T')[0])
                   .lte("expense_date", end.toISOString().split('T')[0]);
      
      if (typeFilter !== "all") {
        query = query.eq("expense_type", typeFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ownerId
  });

  // Fetch profit based on filter - matches Dashboard calculation exactly
  const { data: filteredProfit = 0, isLoading: profitLoading } = useQuery({
    queryKey: ["filteredProfit", dateFilter, ownerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      // First get sales in the date range (exclude deleted sales)
      const { data: sales } = await supabase
        .from("sales")
        .select("id, discount")
        .is("deleted_at", null)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (!sales || sales.length === 0) return 0;
      
      const saleIds = sales.map(sale => sale.id);
      
      // Get sale items excluding returns and deleted items
      const { data, error } = await supabase
        .from("sale_items")
        .select("profit, is_return, is_deleted")
        .in("sale_id", saleIds)
        .eq("is_deleted", false);
      
      if (error) throw error;
      
      // Filter out return items - they are tracking only
      const regularItems = data?.filter(item => !item.is_return) || [];
      const rawProfit = regularItems.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
      
      // Subtract total discount from profit
      const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
      return rawProfit - totalDiscount;
    },
    enabled: !!ownerId
  });

  // Fetch previous period profit for comparison - matches Dashboard calculation
  const { data: previousProfit = 0 } = useQuery({
    queryKey: ["previousProfit", dateFilter, ownerId],
    queryFn: async () => {
      if (dateFilter === "all" || dateFilter === "grand" || dateFilter === "custom") return 0;
      
      const { start, end } = getPreviousPeriodRange();
      
      const { data: sales } = await supabase
        .from("sales")
        .select("id, discount")
        .is("deleted_at", null)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (!sales || sales.length === 0) return 0;
      
      const saleIds = sales.map(sale => sale.id);
      
      const { data, error } = await supabase
        .from("sale_items")
        .select("profit, is_return, is_deleted")
        .in("sale_id", saleIds)
        .eq("is_deleted", false);
      
      if (error) throw error;
      
      // Filter out return items
      const regularItems = data?.filter(item => !item.is_return) || [];
      const rawProfit = regularItems.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
      
      // Subtract total discount from profit
      const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
      return rawProfit - totalDiscount;
    },
    enabled: !!ownerId && dateFilter !== "all" && dateFilter !== "grand" && dateFilter !== "custom"
  });

  // Fetch expenses total based on filter
  const { data: filteredExpensesTotal = 0, isLoading: expensesTotalLoading } = useQuery({
    queryKey: ["filteredExpensesTotal", dateFilter, ownerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", start.toISOString().split('T')[0])
        .lte("expense_date", end.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    },
    enabled: !!ownerId
  });

  // Fetch previous period expenses for comparison
  const { data: previousExpenses = 0 } = useQuery({
    queryKey: ["previousExpenses", dateFilter, ownerId],
    queryFn: async () => {
      if (dateFilter === "all" || dateFilter === "grand" || dateFilter === "custom") return 0;
      
      const { start, end } = getPreviousPeriodRange();
      
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", start.toISOString().split('T')[0])
        .lte("expense_date", end.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    },
    enabled: !!ownerId && dateFilter !== "all" && dateFilter !== "grand" && dateFilter !== "custom"
  });

  // Calculate filtered totals
  const filteredTotalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const netProfit = filteredProfit - filteredExpensesTotal;
  const previousNetProfit = previousProfit - previousExpenses;

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const profitChange = calculatePercentageChange(filteredProfit, previousProfit);
  const expensesChange = calculatePercentageChange(filteredExpensesTotal, previousExpenses);
  const netProfitChange = calculatePercentageChange(netProfit, previousNetProfit);

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("expenses").insert({
        owner_id: ownerId,
        expense_type: data.expense_type,
        amount: parseFloat(data.amount),
        description: data.description || null,
        expense_date: data.expense_date
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["filteredExpensesTotal"] });
      queryClient.invalidateQueries({ queryKey: ["previousExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpenseTypes"] });
      toast.success("Expense added successfully");
      setIsDialogOpen(false);
      setFormData({
        expense_type: "",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().split('T')[0]
      });
    },
    onError: (error) => {
      toast.error("Failed to add expense: " + error.message);
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["filteredExpensesTotal"] });
      queryClient.invalidateQueries({ queryKey: ["previousExpenses"] });
      toast.success("Expense deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete expense: " + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Permission check for create
    if (!hasPermission("expenses", "create")) {
      toast.error("You don't have permission to add expenses");
      return;
    }
    
    if (!formData.expense_type || !formData.amount) {
      toast.error("Please fill in required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await addExpenseMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    // Permission check for delete
    if (!hasPermission("expenses", "delete")) {
      toast.error("You don't have permission to delete expenses");
      return;
    }
    
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full overflow-x-hidden">
      {(expensesLoading || profitLoading || expensesTotalLoading) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Loading expenses..." />
        </div>
      )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
          <div className="flex gap-3 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            {hasPermission("expenses", "create") && (
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline"
                size="sm"
                disabled={expensesLoading || isImporting}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {isImporting ? "Importing..." : "Import CSV"}
              </Button>
            )}
            <Button 
              onClick={handleExportCSV} 
              variant="outline"
              size="sm"
              disabled={expensesLoading || expenses.length === 0}
            >
              {expensesLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Export CSV
            </Button>
            {hasPermission("expenses", "create") && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Expense
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_type">Expense Type *</Label>
                  <Input
                    id="expense_type"
                    value={formData.expense_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_type: e.target.value }))}
                    placeholder="Enter expense type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Expense
                </Button>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>

        {/* Profit Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getDateRangeLabel()} Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {filteredProfit.toLocaleString()}
                  </div>
                  {dateFilter !== "grand" && dateFilter !== "custom" && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(profitChange).toFixed(1)}% {getComparisonLabel()}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getDateRangeLabel()} Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {expensesTotalLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    Rs. {filteredExpensesTotal.toLocaleString()}
                  </div>
                  {dateFilter !== "grand" && dateFilter !== "custom" && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {expensesChange > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(expensesChange).toFixed(1)}% {getComparisonLabel()}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit ({getDateRangeLabel()})</CardTitle>
              <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              {profitLoading || expensesTotalLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
              ) : (
                <>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {netProfit.toLocaleString()}
                  </div>
                  {dateFilter !== "grand" && dateFilter !== "custom" && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${netProfitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netProfitChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(netProfitChange).toFixed(1)}% {getComparisonLabel()}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label>Date Filter</Label>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilterValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FILTERS.map(filter => (
                      <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dateFilter === "custom" && (
                <>
                  <div className="flex-1 min-w-[150px]">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
              <div className="flex-1 min-w-[150px]">
                <Label>Expense Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {allExpenseTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Filtered Total: </span>
                  <span className="text-lg font-bold text-foreground">Rs. {filteredTotalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="pt-6">
            {expensesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses found for the selected filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-secondary rounded-md text-sm">
                          {expense.expense_type}
                        </span>
                      </TableCell>
                      <TableCell>{expense.description || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        Rs. {Number(expense.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasPermission("expenses", "delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleteExpenseMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
