import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Users, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportCustomersToCSV, parseCustomersCSV } from "@/lib/csvExport";

interface CustomerWithTotals {
  name: string;
  phone: string | null;
  total_credit: number;
  total_paid: number;
  remaining_balance: number;
  oldest_unpaid_date: string | null;
}

const Customers = () => {
  const { hasPermission, userRole } = useAuth();
  const { formatDate } = useTimezone();
  
  // Permission checks - customers is primarily view-only, but we still track permissions
  const canCreate = userRole === "admin" || hasPermission("customers", "create");
  const canEdit = userRole === "admin" || hasPermission("customers", "edit");
  const canDelete = userRole === "admin" || hasPermission("customers", "delete");
  
  const [customers, setCustomers] = useState<CustomerWithTotals[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithTotals[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedCustomers = parseCustomersCSV(text);
      
      if (parsedCustomers.length === 0) {
        toast.error("No valid customers found in CSV");
        return;
      }

      // For customers, we create sales entries with 0 amounts to register them
      let imported = 0;
      for (const customer of parsedCustomers) {
        // Check if customer already exists
        const exists = customers.some(c => c.name === customer.name);
        if (!exists) {
          // We can't directly insert customers since they come from sales
          // This is informational import only
          imported++;
        }
      }

      toast.info(`Found ${imported} new customers in CSV. Customers are created automatically through sales.`);
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch all sales data
      const { data: salesData } = await supabase
        .from("sales")
        .select("customer_name, customer_phone, final_amount, paid_amount, created_at")
        .not("customer_name", "is", null)
        .order("created_at", { ascending: true });

      // Create a map to aggregate customer data
      const customerMap = new Map<string, CustomerWithTotals>();

      salesData?.forEach((sale) => {
        if (!sale.customer_name) return;

        const existing = customerMap.get(sale.customer_name);
        const remainingAmount = sale.final_amount - (sale.paid_amount || 0);
        const isUnpaid = remainingAmount > 0;

        if (existing) {
          existing.total_credit += sale.final_amount;
          existing.total_paid += sale.paid_amount || 0;
          existing.remaining_balance += remainingAmount;
          // Update oldest unpaid date only if this invoice is unpaid and older
          if (isUnpaid && (!existing.oldest_unpaid_date || sale.created_at < existing.oldest_unpaid_date)) {
            existing.oldest_unpaid_date = sale.created_at;
          }
        } else {
          customerMap.set(sale.customer_name, {
            name: sale.customer_name,
            phone: sale.customer_phone,
            total_credit: sale.final_amount,
            total_paid: sale.paid_amount || 0,
            remaining_balance: remainingAmount,
            oldest_unpaid_date: isUnpaid ? sale.created_at : null,
          });
        }
      });

      const uniqueCustomers = Array.from(customerMap.values());
      setCustomers(uniqueCustomers);
      setFilteredCustomers(uniqueCustomers);
      toast.success("Customer list refreshed");
    } catch (error) {
      toast.error("Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
    );

    setFilteredCustomers(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            Customer List
          </h1>
          <p className="text-muted-foreground mt-1 text-base">View all customers with credit summary</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          {canCreate && (
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              disabled={isLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          )}
          <Button 
            onClick={() => exportCustomersToCSV(filteredCustomers)} 
            variant="outline"
            disabled={isLoading || filteredCustomers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={fetchCustomers}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        </div>
      ) : (
        <>
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Search by Name or Phone</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setSearchTerm("")}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  Clear Search
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total Customers: <span className="font-semibold text-foreground">{filteredCustomers.length}</span>
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Total Credit</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                  <TableHead>Oldest Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <TableRow key={`${customer.name}-${index}`}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="text-right">Rs. {customer.total_credit.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary">
                        Rs. {customer.total_paid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.remaining_balance > 0 ? (
                          <span className="text-warning font-medium">
                            Rs. {customer.remaining_balance.toFixed(2)}
                          </span>
                        ) : (
                          <Badge className="bg-success text-success-foreground">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.oldest_unpaid_date ? (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            {formatDate(customer.oldest_unpaid_date)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default Customers;
