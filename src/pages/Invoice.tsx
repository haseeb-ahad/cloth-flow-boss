import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Printer } from "lucide-react";

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
}

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
}

const Invoice = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").gt("stock_quantity", 0);
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
          total_price: product.selling_price * newItems[index].quantity,
        };
      }
    } else if (field === "quantity") {
      newItems[index].quantity = parseInt(value) || 0;
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

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const totalAmount = calculateTotal();
      const finalAmount = calculateFinalAmount();

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_number: invoiceNumber,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          total_amount: totalAmount,
          discount: discount,
          final_amount: finalAmount,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items and update stock
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

        // Update stock
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.product_id);
        }
      }

      toast.success("Invoice created successfully!");
      printInvoice(sale.invoice_number);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create invoice");
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
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Invoice</h1>
        <p className="text-muted-foreground">Generate a new sale receipt</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div>
            <Label htmlFor="customerName">Customer Name (Optional)</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
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
              <div className="md:col-span-5">
                <Label>Product</Label>
                <Select
                  value={item.product_id}
                  onValueChange={(value) => updateItem(index, "product_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Price</Label>
                <Input type="number" value={item.unit_price} disabled />
              </div>
              <div className="md:col-span-2">
                <Label>Total</Label>
                <Input type="number" value={item.total_price} disabled />
              </div>
              <div className="md:col-span-1">
                <Button
                  onClick={() => removeItem(index)}
                  variant="destructive"
                  size="icon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="discount">Discount (PKR)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center text-lg font-semibold pt-4 border-t">
            <span>Total Amount:</span>
            <span className="text-2xl text-primary">
              Rs. {calculateTotal().toFixed(2)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center">
              <span>Discount:</span>
              <span className="text-destructive">- Rs. {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Final Amount:</span>
            <span className="text-2xl text-success">
              Rs. {calculateFinalAmount().toFixed(2)}
            </span>
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={saveInvoice} className="flex-1" size="lg">
              <Printer className="h-4 w-4 mr-2" />
              Save & Print Invoice
            </Button>
            <Button onClick={resetForm} variant="outline" size="lg">
              Reset
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Invoice;
