import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Printer, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
  quantity_type: string;
}

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  quantity_type: string;
}

const Invoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSaleId = searchParams.get("edit");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [openProductIndex, setOpenProductIndex] = useState<number | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [originalItems, setOriginalItems] = useState<InvoiceItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomerNames();
    if (editSaleId) {
      loadSaleData(editSaleId);
    }
  }, [editSaleId]);

  const fetchCustomerNames = async () => {
    const { data: salesData } = await supabase.from("sales").select("customer_name").not("customer_name", "is", null);
    const { data: creditsData } = await supabase.from("credits").select("customer_name");
    
    const names = new Set<string>();
    salesData?.forEach(s => s.customer_name && names.add(s.customer_name));
    creditsData?.forEach(c => c.customer_name && names.add(c.customer_name));
    
    setCustomerSuggestions(Array.from(names));
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setShowCustomerSuggestions(value.length > 0);
  };

  const getFilteredCustomers = () => {
    if (!customerName) return [];
    return customerSuggestions.filter(name => 
      name.toLowerCase().includes(customerName.toLowerCase())
    ).slice(0, 5);
  };

  const loadSaleData = async (saleId: string) => {
    try {
      const { data: sale } = await supabase.from("sales").select("*").eq("id", saleId).single();
      const { data: saleItems } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);

      if (sale && saleItems) {
        setInvoiceNumber(sale.invoice_number);
        setCustomerName(sale.customer_name || "");
        setCustomerPhone(sale.customer_phone || "");
        setDiscount(sale.discount || 0);
        setPaymentMethod(sale.payment_method || "cash");
        setPaidAmount(sale.paid_amount?.toString() || "");

        const loadedItems = saleItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          total_price: item.total_price,
          quantity_type: "Unit",
        }));
        setItems(loadedItems);
        setOriginalItems(loadedItems);
      }
    } catch (error) {
      toast.error("Failed to load sale data");
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    if (data) setProducts(data);
  };

  const addItem = () => {
    setItems([...items, {
      product_id: "",
      product_name: "",
      quantity: 1,
      unit_price: 0,
      purchase_price: 0,
      total_price: 0,
      quantity_type: "Unit",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          product_name: product.name,
          unit_price: product.selling_price,
          purchase_price: product.purchase_price,
          quantity_type: product.quantity_type || "Unit",
          total_price: product.selling_price * newItems[index].quantity,
        };
      }
    } else if (field === "quantity") {
      newItems[index].quantity = parseFloat(value) || 0;
      newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
    } else if (field === "unit_price") {
      newItems[index].unit_price = parseFloat(value) || 0;
      newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateFinalAmount = () => {
    return calculateTotal() - discount;
  };

  const saveInvoice = async () => {
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const confirmMessage = editSaleId 
      ? "Are you sure you want to update this sale?" 
      : "Are you sure you want to create this invoice?";
    
    if (!confirm(confirmMessage)) return;

    try {
      if (editSaleId) {
        await updateSale();
      } else {
        await createSale();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save invoice");
    }
  };

  const createSale = async () => {
    const newInvoiceNumber = `INV-${Date.now()}`;
    const totalAmount = calculateTotal();
    const finalAmount = calculateFinalAmount();
    const paid = paidAmount ? parseFloat(paidAmount) : finalAmount;

    if (paid > finalAmount) {
      toast.error("Paid amount cannot be greater than final amount");
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        invoice_number: newInvoiceNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        total_amount: totalAmount,
        discount: discount,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        paid_amount: paid,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    for (const item of items) {
      const profit = (item.unit_price - item.purchase_price) * item.quantity;
      
      await supabase.from("sale_items").insert({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        total_price: item.total_price,
        profit: profit,
      });

      const product = products.find(p => p.id === item.product_id);
      if (product) {
        await supabase
          .from("products")
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq("id", item.product_id);
      }
    }

    if (paid < finalAmount) {
      const creditAmount = finalAmount - paid;
      await supabase.from("credits").insert({
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone || null,
        amount: creditAmount,
        paid_amount: 0,
        remaining_amount: creditAmount,
        status: "pending",
        notes: `Partial payment for invoice ${newInvoiceNumber}`,
      });
    }

    toast.success("Invoice created successfully!");
    printInvoice(newInvoiceNumber);
    resetForm();
  };

  const updateSale = async () => {
    const totalAmount = calculateTotal();
    const finalAmount = calculateFinalAmount();
    const paid = paidAmount ? parseFloat(paidAmount) : finalAmount;

    if (paid > finalAmount) {
      toast.error("Paid amount cannot be greater than final amount");
      return;
    }

    await supabase.from("sales").update({
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      total_amount: totalAmount,
      discount: discount,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      paid_amount: paid,
    }).eq("id", editSaleId);

    await supabase.from("sale_items").delete().eq("sale_id", editSaleId);

    for (const item of items) {
      const profit = (item.unit_price - item.purchase_price) * item.quantity;
      await supabase.from("sale_items").insert({
        sale_id: editSaleId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        total_price: item.total_price,
        profit: profit,
      });
    }

    // Restore stock for returned items
    for (const originalItem of originalItems) {
      const newItem = items.find(i => i.product_id === originalItem.product_id);
      const quantityDiff = originalItem.quantity - (newItem?.quantity || 0);
      
      if (quantityDiff !== 0) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", originalItem.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity + quantityDiff })
            .eq("id", originalItem.product_id);
        }
      }
    }

    // Handle new products added during edit
    for (const item of items) {
      const wasOriginal = originalItems.find(o => o.product_id === item.product_id);
      if (!wasOriginal) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    toast.success("Sale updated successfully!");
    navigate("/sales");
  };

  const handleDeleteSale = async () => {
    if (!editSaleId) return;
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) return;

    try {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", editSaleId);

      if (saleItems) {
        for (const item of saleItems) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({ stock_quantity: product.stock_quantity + item.quantity })
              .eq("id", item.product_id);
          }
        }
        await supabase.from("sale_items").delete().eq("sale_id", editSaleId);
      }

      await supabase.from("sales").delete().eq("id", editSaleId);
      toast.success("Sale deleted successfully!");
      navigate("/sales");
    } catch (error) {
      toast.error("Failed to delete sale");
    }
  };

  const printInvoice = (invoiceNumber: string) => {
    window.print();
  };

  const resetForm = () => {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount(0);
    setPaymentMethod("cash");
    setPaidAmount("");
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {editSaleId && (
          <Button onClick={() => navigate("/sales")} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {editSaleId ? "Edit Sale" : "Create Invoice"}
          </h1>
          <p className="text-muted-foreground">
            {editSaleId ? "Modify sale details and products" : "Generate a new sale receipt"}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="relative">
            <Label htmlFor="customerName">Customer Name (Optional)</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
              placeholder="Enter customer name"
            />
            {showCustomerSuggestions && getFilteredCustomers().length > 0 && (
              <Card className="absolute z-50 w-full mt-1 max-h-[200px] overflow-auto">
                {getFilteredCustomers().map((name, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-muted cursor-pointer"
                    onMouseDown={() => {
                      setCustomerName(name);
                      setShowCustomerSuggestions(false);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </Card>
            )}
          </div>
          <div>
            <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Items</h3>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid gap-4 md:grid-cols-12 items-end border-b pb-4">
              <div className="md:col-span-4">
                <Label>Product</Label>
                <Popover open={openProductIndex === index} onOpenChange={(open) => setOpenProductIndex(open ? index : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openProductIndex === index} className="w-full justify-between">
                      {item.product_name || "Select product..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                updateItem(index, "product_id", product.id);
                                setOpenProductIndex(null);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", item.product_id === product.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Stock: {product.stock_quantity} | Cost: Rs. {product.purchase_price}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <Label>Type</Label>
                <Input type="text" value={item.quantity_type} disabled className="text-xs" />
              </div>
              <div className="md:col-span-2">
                <Label>Price</Label>
                <Input 
                  type="number" 
                  value={item.unit_price} 
                  onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Total</Label>
                <Input type="number" value={item.total_price.toFixed(2)} disabled />
              </div>
              <div className="md:col-span-1">
                <Button onClick={() => removeItem(index)} variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="paidAmount">Paid Amount (Optional)</Label>
              <Input
                id="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Leave empty for full payment"
              />
            </div>
          </div>
          
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">Rs. {calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount:</span>
                <span className="font-medium">- Rs. {discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span className="text-success">Rs. {calculateFinalAmount().toFixed(2)}</span>
              </div>
              {paidAmount && parseFloat(paidAmount) < calculateFinalAmount() && (
                <>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Paid:</span>
                    <span className="font-medium">Rs. {parseFloat(paidAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-warning">
                    <span>Remaining (Credit):</span>
                    <span className="font-medium">Rs. {(calculateFinalAmount() - parseFloat(paidAmount)).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={saveInvoice} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            {editSaleId ? "Update Sale" : "Save & Print"}
          </Button>
          {editSaleId ? (
            <Button onClick={handleDeleteSale} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          ) : (
            <Button onClick={resetForm} variant="outline">
              Reset
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Invoice;
