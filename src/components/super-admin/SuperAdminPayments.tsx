import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Smartphone,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Payment {
  id: string;
  admin_id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  card_last_four: string | null;
  created_at: string;
  profile?: {
    email: string;
    full_name: string | null;
  };
}

const PAYMENT_METHODS = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "nayapay", label: "NayaPay", icon: Wallet },
  { value: "jazzcash", label: "JazzCash", icon: Smartphone },
  { value: "easypaisa", label: "EasyPaisa", icon: Smartphone },
];

const SuperAdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_all_payments" },
      });
      if (error) throw error;
      setPayments(data.payments || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    }
    setIsLoading(false);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    const matchesDate =
      !dateFilter ||
      format(new Date(payment.created_at), "yyyy-MM-dd") === dateFilter;

    return matchesSearch && matchesMethod && matchesStatus && matchesDate;
  });

  // Stats
  const totalRevenue = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  const failedCount = payments.filter((p) => p.status === "failed").length;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; icon: React.ElementType }> = {
      success: { className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      failed: { className: "bg-red-100 text-red-700", icon: XCircle },
      pending: { className: "bg-amber-100 text-amber-700", icon: Clock },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getMethodIcon = (method: string) => {
    const found = PAYMENT_METHODS.find((m) => m.value === method);
    if (found) {
      const Icon = found.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <CreditCard className="w-4 h-4" />;
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtext,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    subtext?: string;
  }) => (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={`Rs ${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtext="From successful payments"
        />
        <StatCard
          title="Pending Payments"
          value={`Rs ${pendingAmount.toLocaleString()}`}
          icon={Clock}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtext="Awaiting confirmation"
        />
        <StatCard
          title="Failed Transactions"
          value={failedCount.toString()}
          icon={AlertCircle}
          color="bg-gradient-to-br from-red-500 to-red-600"
          subtext="Need attention"
        />
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                All Payments
              </CardTitle>
              <CardDescription>View and manage all subscription payments</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48 h-9"
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-medium">No Payments Found</p>
              <p className="text-sm">Payments will appear here when store admins subscribe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">
                            {payment.profile?.full_name || "Unnamed"}
                          </p>
                          <p className="text-sm text-slate-500">{payment.profile?.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        Rs {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          {getMethodIcon(payment.payment_method)}
                          <span className="capitalize">{payment.payment_method}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-mono text-sm">
                        {payment.transaction_id || "—"}
                        {payment.card_last_four && (
                          <span className="ml-2 text-slate-400">••••{payment.card_last_four}</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-slate-600">
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                        <br />
                        <span className="text-xs text-slate-400">
                          {format(new Date(payment.created_at), "h:mm a")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPayments;
