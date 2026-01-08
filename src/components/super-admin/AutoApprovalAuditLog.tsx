import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Loader2, 
  ShieldCheck, 
  UserCheck,
  Hash,
  FileText,
  DollarSign,
  Copy,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  X
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  image_hash: string | null;
  transaction_id: string | null;
  amount: number | null;
  ip_address: string | null;
  created_at: string;
  details: {
    plan_name?: string;
    proof_url?: string;
    payment_request_id?: string;
    approval_checks?: {
      unique_hash: boolean;
      unique_transaction: boolean;
      amount_matches: boolean;
      no_duplicate_approved: boolean;
    };
    auto_approve_enabled?: boolean;
    rejection_reason?: string;
    approved_by?: string;
  } | null;
  profile?: {
    email: string;
    full_name: string | null;
  };
}

const AutoApprovalAuditLog = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "auto" | "manual" | "pending">("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async (fromDate?: Date, toDate?: Date) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { 
          action: "get_approval_audit_logs",
          data: {
            start_date: fromDate ? startOfDay(fromDate).toISOString() : undefined,
            end_date: toDate ? endOfDay(toDate).toISOString() : undefined,
          }
        },
      });

      if (error) throw error;
      setLogs(data?.logs || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
    setIsLoading(false);
  };

  const handleDateFilter = () => {
    fetchAuditLogs(startDate, endDate);
  };

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    fetchAuditLogs();
  };

  const applyQuickFilter = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(start);
    setEndDate(end);
    fetchAuditLogs(start, end);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "auto") return log.action === "auto_approved";
    if (filter === "manual") return log.action === "manually_approved";
    if (filter === "pending") return log.action === "payment_submitted";
    return true;
  });

  const getStatusBadge = (action: string) => {
    switch (action) {
      case "auto_approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Auto-Approved
          </Badge>
        );
      case "manually_approved":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <UserCheck className="w-3 h-3 mr-1" />
            Manually Approved
          </Badge>
        );
      case "payment_submitted":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "payment_rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {action}
          </Badge>
        );
    }
  };

  const CheckItem = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={passed ? "text-emerald-700" : "text-red-700"}>{label}</span>
    </div>
  );

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Auto-Approval Audit Log
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              View all payment approval activities with security check results
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(startDate, endDate)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-2 mt-4 p-3 rounded-lg bg-slate-50 border">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-slate-600 mb-1 block">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {startDate ? format(startDate, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-slate-600 mb-1 block">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {endDate ? format(endDate, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" onClick={handleDateFilter} className="h-8 text-xs">
              Apply
            </Button>
            {(startDate || endDate) && (
              <Button size="sm" variant="ghost" onClick={clearDateFilter} className="h-8 px-2">
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-1 mt-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1 self-center">Quick:</span>
          {[
            { label: "7 days", days: 7 },
            { label: "30 days", days: 30 },
            { label: "90 days", days: 90 },
          ].map((q) => (
            <Button
              key={q.days}
              variant="ghost"
              size="sm"
              onClick={() => applyQuickFilter(q.days)}
              className="h-6 text-xs px-2"
            >
              {q.label}
            </Button>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {[
            { key: "all", label: "All", count: logs.length },
            { key: "auto", label: "Auto-Approved", count: logs.filter(l => l.action === "auto_approved").length },
            { key: "manual", label: "Manual", count: logs.filter(l => l.action === "manually_approved").length },
            { key: "pending", label: "Pending", count: logs.filter(l => l.action === "payment_submitted").length },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as typeof filter)}
              className="text-xs"
            >
              {tab.label}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                {tab.count}
              </span>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                >
                  {/* Header Row */}
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(log.action)}
                        {log.amount && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            Rs {log.amount.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1.5 truncate">
                        {log.profile?.full_name || log.profile?.email || "Unknown User"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.details?.plan_name && (
                        <Badge variant="secondary" className="text-xs hidden sm:flex">
                          {log.details.plan_name}
                        </Badge>
                      )}
                      {expandedLogId === log.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLogId === log.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Security Check Results */}
                      {log.details?.approval_checks && (
                        <div className="p-3 rounded-lg bg-slate-50">
                          <p className="text-xs font-medium text-slate-700 mb-2">Security Checks</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <CheckItem 
                              passed={log.details.approval_checks.unique_hash} 
                              label="Unique Image Hash" 
                            />
                            <CheckItem 
                              passed={log.details.approval_checks.unique_transaction} 
                              label="Unique Transaction ID" 
                            />
                            <CheckItem 
                              passed={log.details.approval_checks.amount_matches} 
                              label="Amount Matches Plan" 
                            />
                            <CheckItem 
                              passed={log.details.approval_checks.no_duplicate_approved} 
                              label="No Duplicate Payments" 
                            />
                          </div>
                        </div>
                      )}

                      {/* Transaction Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {log.transaction_id && (
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">TxID:</span>
                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]">
                              {log.transaction_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(log.transaction_id || "");
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">IP:</span>
                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                              {log.ip_address}
                            </code>
                          </div>
                        )}
                      </div>

                      {/* Image Hash (truncated) */}
                      {log.image_hash && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600">Image Hash:</span>
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded truncate max-w-[200px]">
                            {log.image_hash.substring(0, 16)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.image_hash || "");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {/* Proof Image Link */}
                      {log.details?.proof_url && (
                        <div>
                          <a
                            href={log.details.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Payment Screenshot →
                          </a>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {log.details?.rejection_reason && (
                        <div className="p-2 rounded bg-red-50 text-red-700 text-sm">
                          <strong>Rejection Reason:</strong> {log.details.rejection_reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoApprovalAuditLog;
