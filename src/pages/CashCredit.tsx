import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Banknote, Loader2, Search } from "lucide-react";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface Customer {
  name: string;
  phone: string | null;
}

const CashCredit = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDateInput } = useTimezone();
  
  const canCreate = userRole === "admin" || hasPermission("credits", "create");
  
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [formData, setFormData] = useState({
    person_type: "",
    name: "",
    phone: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("sales")
      .select("customer_name, customer_phone")
      .not("customer_name", "is", null);
    
    if (data) {
      const uniqueCustomers = new Map<string, Customer>();
      data.forEach(sale => {
        if (sale.customer_name) {
          const key = `${sale.customer_name}-${sale.customer_phone || ''}`;
          if (!uniqueCustomers.has(key)) {
            uniqueCustomers.set(key, {
              name: sale.customer_name,
              phone: sale.customer_phone
            });
          }
        }
      });
      setCustomers(Array.from(uniqueCustomers.values()));
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      name: customer.name,
      phone: customer.phone || ""
    }));
    setSearchTerm(customer.name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      toast.error("You do not have permission to create credits.");
      return;
    }

    if (!formData.person_type) {
      toast.error("Please select a person type");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("credits").insert({
        customer_name: formData.name.trim(),
        customer_phone: formData.phone || null,
        amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        due_date: formData.date || null,
        status: "pending",
        notes: formData.notes || null,
        owner_id: ownerId,
        credit_type: "cash",
        person_type: formData.person_type,
      });

      if (error) throw error;

      toast.success("Cash credit successfully added");
      
      // Reset form
      setFormData({
        person_type: "",
        name: "",
        phone: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        notes: "",
      });
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding cash credit:", error);
      toast.error("Failed to add cash credit");
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">You do not have permission to add cash credits.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Saving..." />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cash Credit (Udhar Diya)</h1>
        <p className="text-muted-foreground">Record cash given as credit to any person</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Add Cash Credit
          </CardTitle>
          <CardDescription>
            Enter the details of cash credit given
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person Type */}
            <div className="space-y-2">
              <Label htmlFor="person_type">Person Type *</Label>
              <Select
                value={formData.person_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, person_type: value }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="market_person">Market Person</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name with autocomplete */}
            <div className="space-y-2 relative">
              <Label htmlFor="name">Name *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Search existing or enter new name"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              {showSuggestions && searchTerm && filteredCustomers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                  {filteredCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <p className="font-medium">{customer.name}</p>
                      {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Given (Cash) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                min="0.01"
                step="0.01"
                disabled={isLoading}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Reference / Note</Label>
              <Textarea
                id="notes"
                placeholder="Enter any reference or note (optional)"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Cash Credit"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashCredit;
