import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, RefreshCw, Search, PackageSearch, DollarSign, TrendingUp } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  category: string | null;
  quantity_type: string;
  created_at: string | null;
}

interface StockStats {
  stockCost: number;
  stockSellWorth: number;
  sellProfit: number;
  totalProducts: number;
  lowStockCount: number;
  totalStockByType: {
    Unit: number;
    Than: number;
    Suit: number;
    Meter: number;
  };
}

const Inventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stockStats, setStockStats] = useState<StockStats>({
    stockCost: 0,
    stockSellWorth: 0,
    sellProfit: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalStockByType: { Unit: 0, Than: 0, Suit: 0, Meter: 0 },
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    purchase_price: "",
    selling_price: "",
    stock_quantity: "",
    category: "",
    quantity_type: "Unit",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to load products");
        return;
      }
      
      if (data) {
        setProducts(data);
        setFilteredProducts(data);
        calculateStockStats(data);
      }
      toast.success("Products refreshed");
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStockStats = (productsData: Product[]) => {
    const stockCost = productsData.reduce(
      (sum, product) => sum + Number(product.purchase_price) * product.stock_quantity,
      0
    );
    
    const stockSellWorth = productsData.reduce(
      (sum, product) => sum + Number(product.selling_price) * product.stock_quantity,
      0
    );
    
    const sellProfit = stockSellWorth - stockCost;
    
    const totalStockByType = productsData.reduce(
      (acc, product) => {
        const type = product.quantity_type || 'Unit';
        acc[type as keyof typeof acc] = (acc[type as keyof typeof acc] || 0) + product.stock_quantity;
        return acc;
      },
      { Unit: 0, Than: 0, Suit: 0, Meter: 0 }
    );
    
    const lowStockCount = productsData.filter(p => p.stock_quantity < 10).length;
    
    setStockStats({
      stockCost,
      stockSellWorth,
      sellProfit,
      totalProducts: productsData.length,
      lowStockCount,
      totalStockByType,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    setFilteredProducts(filtered);
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter((cat): cat is string => cat !== null && cat !== "")
      .filter((cat, index, self) => self.indexOf(cat) === index)
      .sort();
    return categories;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const confirmMessage = editingProduct 
      ? "Are you sure you want to update this product?" 
      : "Are you sure you want to add this product?";
    
    if (!confirm(confirmMessage)) return;
    
    const productData = {
      name: formData.name,
      description: formData.description || null,
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: parseFloat(formData.stock_quantity),
      category: formData.category || null,
      quantity_type: formData.quantity_type,
    };

    try {
      if (editingProduct) {
        await supabase.from("products").update(productData).eq("id", editingProduct.id);
        toast.success("Product updated successfully!");
      } else {
        await supabase.from("products").insert({ ...productData, owner_id: user?.id });
        toast.success("Product added successfully!");
      }
      
      await fetchProducts();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      category: product.category || "",
      quantity_type: product.quantity_type || "Unit",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!editingProduct) return;
    
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }
    
    setIsSaving(true);
    try {
      // First check if product has been used in any sales
      const { data: saleItems, error: checkError } = await supabase
        .from("sale_items")
        .select("id")
        .eq("product_id", editingProduct.id)
        .limit(1);
      
      if (checkError) {
        console.error("Error checking sales:", checkError);
        toast.error("Failed to check product usage");
        return;
      }
      
      if (saleItems && saleItems.length > 0) {
        toast.error(
          "Cannot delete this product because it has been used in sales. Sales history must be preserved.",
          { duration: 5000 }
        );
        return;
      }
      
      // If no sales, proceed with deletion
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", editingProduct.id);
      
      if (error) {
        console.error("Delete error:", error);
        toast.error(`Failed to delete product: ${error.message}`);
        return;
      }
      
      toast.success("Product deleted successfully!");
      setIsDialogOpen(false);
      resetForm();
      await fetchProducts();
    } catch (error: any) {
      console.error("Delete exception:", error);
      toast.error(`Failed to delete product: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      purchase_price: "",
      selling_price: "",
      stock_quantity: "",
      category: "",
      quantity_type: "Unit",
    });
    setEditingProduct(null);
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (quantity < 10) return <Badge variant="secondary" className="bg-warning text-warning-foreground">Low Stock</Badge>;
    return <Badge className="bg-success text-success-foreground">In Stock</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your products and stock</p>
        </div>
      </div>

      {/* Stock Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">Stock Cost</CardTitle>
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center ring-4 ring-destructive/5">
              <PackageSearch className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(stockStats.stockCost)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total purchase cost</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">Stock Sell Worth</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(stockStats.stockSellWorth)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total selling price value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">Sell Profit</CardTitle>
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center ring-4 ring-success/5">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success tracking-tight">{formatCurrency(stockStats.sellProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Potential profit margin</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">Total Stock</CardTitle>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center ring-4 ring-accent/5">
              <PackageSearch className="h-5 w-5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Unit:</span>
                <span className="font-bold">{stockStats.totalStockByType.Unit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Than:</span>
                <span className="font-bold">{stockStats.totalStockByType.Than}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Suit:</span>
                <span className="font-bold">{stockStats.totalStockByType.Suit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Meter:</span>
                <span className="font-bold">{stockStats.totalStockByType.Meter}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide">Products Overview</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
              <PackageSearch className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Products</p>
                <div className="text-2xl font-bold text-foreground">{stockStats.totalProducts}</div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">Low Stock Items</p>
                <div className="text-2xl font-bold text-destructive">{stockStats.lowStockCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button onClick={fetchProducts} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              resetForm();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add product
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit product" : "Add new product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Product name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="purchase_price">Purchase price *</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price">Selling price *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock quantity *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    step="0.01"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quantity_type">Quantity Type *</Label>
                <Select value={formData.quantity_type} onValueChange={(value) => setFormData({ ...formData, quantity_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meter">Meter</SelectItem>
                    <SelectItem value="Than">Than</SelectItem>
                    <SelectItem value="Suit">Suit</SelectItem>
                    <SelectItem value="Unit">Unit</SelectItem>
                    <SelectItem value="Piece">Piece</SelectItem>
                    <SelectItem value="Kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingProduct ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    editingProduct ? "Update product" : "Add product"
                  )}
                </Button>
                {editingProduct && (
                  <Button type="button" onClick={handleDelete} variant="destructive" disabled={isSaving}>
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <Label>Search by Name or Category</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label>Filter by Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {getUniqueCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }} 
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Product name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Purchase price</TableHead>
              <TableHead className="text-right">Selling price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product, index) => (
              <TableRow key={product.id}>
                <TableCell className="font-semibold text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground">{product.description}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.category || "-"}</TableCell>
                <TableCell className="text-right">Rs. {product.purchase_price.toFixed(2)}</TableCell>
                <TableCell className="text-right text-success font-semibold">
                  Rs. {product.selling_price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-semibold">{product.stock_quantity}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{product.quantity_type}</Badge>
                </TableCell>
                <TableCell className="text-center">{getStockBadge(product.stock_quantity)}</TableCell>
                <TableCell className="text-center">
                  <Button size="icon" variant="outline" onClick={() => handleEdit(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Inventory;
