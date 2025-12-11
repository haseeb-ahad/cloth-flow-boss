import { useState, useMemo, useRef } from "react";
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
import { formatDatePKT, formatDateInputPKT, toPKT, cn } from "@/lib/utils";
import { exportExpensesToCSV, parseExpensesCSV } from "@/lib/csvExport";
import { format } from "date-fns";

const EXPENSE_TYPES = [
  "Utilities",
  "Rent",
  "Salary",
  "Transportation",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Food",
  "Other"
];

const DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "1 Week", value: "1week" },
  { label: "1 Month", value: "1month" },
  { label: "1 Year", value: "1year" },
  { label: "Grand Report", value: "grand" },
  { label: "Custom", value: "custom" },
];

export default function Expenses() {
  const { user, ownerId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    expense_type: "",
    amount: "",
    description: "",
    expense_date: formatDateInputPKT(new Date())
  });

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedExpenses = parseExpensesCSV(text);
      
      if (parsedExpenses.length === 0) {
        toast.error("No valid expenses found in CSV");
        return;
      }

      let imported = 0;
      for (const expense of parsedExpenses) {
        const { error } = await supabase.from("expenses").insert({
          ...expense,
          owner_id: ownerId,
        });
        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} expenses`);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] });
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateFilter) {
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

  const getDateRangeLabel = () => {
    switch (dateFilter) {
      case "today": return "Today's";
      case "yesterday": return "Yesterday's";
      case "1week": return "Weekly";
      case "1month": return "Monthly";
      case "1year": return "Yearly";
      case "grand": return "All Time";
      case "custom": return startDate && endDate ? `${format(startDate, "PP")} - ${format(endDate, "PP")}` : "Custom";
      default: return "Today's";
    }
  };

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

  // Fetch profit based on filter
  const { data: filteredProfit = 0, isLoading: profitLoading } = useQuery({
    queryKey: ["filteredProfit", dateFilter, ownerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      // First get sales in the date range
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (!sales || sales.length === 0) return 0;
      
      const saleIds = sales.map(sale => sale.id);
      
      const { data, error } = await supabase
        .from("sale_items")
        .select("profit")
        .in("sale_id", saleIds);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (Number(item.profit) || 0), 0) || 0;
    },
    enabled: !!ownerId
  });

  // Fetch expenses total based on filter
  const { data: filteredExpensesTotal = 0 } = useQuery({
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

  // Calculate filtered totals
  const filteredTotalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const netProfit = filteredProfit - filteredExpensesTotal;

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
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] });
      toast.success("Expense added successfully");
      setIsDialogOpen(false);
      setFormData({
        expense_type: "",
        amount: "",
        description: "",
        expense_date: formatDateInputPKT(new Date())
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
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] });
      toast.success("Expense deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete expense: " + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Expenses</h1>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              disabled={expensesLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
            <Button 
              onClick={() => exportExpensesToCSV(expenses)} 
              variant="outline"
              disabled={expensesLoading || expenses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
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
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  Rs. {filteredProfit.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getDateRangeLabel()} Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rs. {filteredExpensesTotal.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit ({getDateRangeLabel()})</CardTitle>
              <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {netProfit.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label>Date Filter</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
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
                    {EXPENSE_TYPES.map(type => (
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
                      <TableCell>{formatDatePKT(expense.expense_date)}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                          disabled={deleteExpenseMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
