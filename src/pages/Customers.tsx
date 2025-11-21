import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  name: string;
  phone: string | null;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("customer_name, customer_phone")
        .not("customer_name", "is", null);
      
      const { data: creditsData } = await supabase
        .from("credits")
        .select("customer_name, customer_phone");

      // Create a map to ensure unique customers
      const customerMap = new Map<string, string | null>();
      
      salesData?.forEach(s => {
        if (s.customer_name && !customerMap.has(s.customer_name)) {
          customerMap.set(s.customer_name, s.customer_phone);
        }
      });
      
      creditsData?.forEach(c => {
        if (c.customer_name && !customerMap.has(c.customer_name)) {
          customerMap.set(c.customer_name, c.customer_phone);
        }
      });

      // Convert map to array of customer objects
      const uniqueCustomers = Array.from(customerMap.entries()).map(([name, phone]) => ({
        name,
        phone
      }));

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

    const filtered = customers.filter(customer => 
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
          <p className="text-muted-foreground mt-1 text-base">View all customers</p>
        </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer, index) => (
                <TableRow key={`${customer.name}-${index}`}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Customers;
