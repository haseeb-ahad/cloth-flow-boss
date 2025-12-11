import { useState, useMemo } from "react";
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
import { toast } from "sonner";
import { Plus, Loader2, Trash2, TrendingUp, TrendingDown, DollarSign, Download } from "lucide-react";
import { formatDatePKT, formatDateInputPKT, toPKT } from "@/lib/utils";
import { exportExpensesToPDF } from "@/lib/pdfExport";

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
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "All Time", value: "all" },
];

export default function Expenses() {
  const { user, ownerId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    expense_type: "",
    amount: "",
    description: "",
    expense_date: formatDateInputPKT(new Date())
  });

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = toPKT(new Date());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };
      case "week":
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "year":
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      default:
        return null;
    }
  };

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", dateFilter, typeFilter, ownerId],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      
      const dateRange = getDateRange();
      if (dateRange) {
        query = query.gte("expense_date", formatDateInputPKT(dateRange.start))
                     .lt("expense_date", formatDateInputPKT(dateRange.end));
      }
      
      if (typeFilter !== "all") {
        query = query.eq("expense_type", typeFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ownerId
  });

  // Fetch today's profit (sales profit for today)
  const { data: todayProfit = 0, isLoading: profitLoading } = useQuery({
    queryKey: ["todayProfit", ownerId],
    queryFn: async () => {
      const now = toPKT(new Date());
      const todayStart = formatDateInputPKT(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      const tomorrowStart = formatDateInputPKT(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      
      const { data, error } = await supabase
        .from("sale_items")
        .select("profit, sales!inner(created_at, owner_id)")
        .gte("sales.created_at", todayStart)
        .lt("sales.created_at", tomorrowStart);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (Number(item.profit) || 0), 0) || 0;
    },
    enabled: !!ownerId
  });

  // Fetch today's expenses total
  const { data: todayExpenses = 0 } = useQuery({
    queryKey: ["todayExpenses", ownerId],
    queryFn: async () => {
      const now = toPKT(new Date());
      const todayStart = formatDateInputPKT(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      const tomorrowStart = formatDateInputPKT(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", todayStart)
        .lt("expense_date", tomorrowStart);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    },
    enabled: !!ownerId
  });

  // Calculate filtered totals
  const filteredTotalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const netProfit = todayProfit - todayExpenses;

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
            <Button 
              onClick={() => exportExpensesToPDF(expenses)} 
              variant="outline"
              disabled={expensesLoading || expenses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
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
              <CardTitle className="text-sm font-medium">Today's Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  Rs. {todayProfit.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rs. {todayExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (Today)</CardTitle>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
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
              <div className="flex-1">
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
