import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, RefreshCw, Search, Download, Upload, PackageSearch, DollarSign, TrendingUp, Image as ImageIcon, Printer } from "lucide-react";
import { exportInventoryToCSV, parseInventoryCSV } from "@/lib/csvExport";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import ProductQRCode from "@/components/inventory/ProductQRCode";
import ProductImageUpload from "@/components/inventory/ProductImageUpload";
import BatchQRPrint from "@/components/inventory/BatchQRPrint";

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
  sku: string | null;
  supplier_name: string | null;
  image_url: string | null;
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
  const { ownerId, hasPermission, userRole } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  // Permission checks
  const canCreate = userRole === "admin" || hasPermission("inventory", "create");
  const canEdit = userRole === "admin" || hasPermission("inventory", "edit");
  const canDelete = userRole === "admin" || hasPermission("inventory", "delete");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBatchQR, setShowBatchQR] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    sku: "",
    supplier_name: "",
    image_url: "",
  });

  // Generate unique SKU
  const generateSKU = () => {
    const prefix = formData.category ? formData.category.substring(0, 3).toUpperCase() : "PRD";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedProducts = parseInventoryCSV(text);
      
      if (parsedProducts.length === 0) {
        toast.error("No valid products found in CSV");
        return;
      }

      let imported = 0;
      for (const product of parsedProducts) {
        const sku = `IMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        const { error } = await supabase.from("products").insert({
          ...product,
          owner_id: ownerId,
          sku,
        });
        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} products`);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchProducts();

    // Subscribe to real-time changes for instant sync
    const productsChannel = supabase
      .channel('inventory-products-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
    };
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
        
        // Calculate stock stats
        const stockCost = data.reduce(
          (sum, product) => sum + Number(product.purchase_price) * product.stock_quantity,
          0
        );
        const stockSellWorth = data.reduce(
          (sum, product) => sum + Number(product.selling_price) * product.stock_quantity,
          0
        );
        const sellProfit = stockSellWorth - stockCost;
        const totalProducts = data.length;
        const lowStockCount = data.filter(p => p.stock_quantity < 10).length;
        const totalStockByType = data.reduce(
          (acc, product) => {
            const type = product.quantity_type || 'Unit';
            acc[type as keyof typeof acc] = (acc[type as keyof typeof acc] || 0) + product.stock_quantity;
            return acc;
          },
          { Unit: 0, Than: 0, Suit: 0, Meter: 0 }
        );
        
        setStockStats({
          stockCost,
          stockSellWorth,
          sellProfit,
          totalProducts,
          lowStockCount,
          totalStockByType,
        });
      }
      toast.success(t("productsRefreshed"));
    } catch (error) {
      toast.error(t("errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()))
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
    
    // PERMISSION CHECK
    if (editingProduct && !canEdit) {
      toast.error("You do not have permission to edit products.");
      return;
    }
    if (!editingProduct && !canCreate) {
      toast.error("You do not have permission to create products.");
      return;
    }
    
    const confirmMessage = editingProduct 
      ? "Are you sure you want to update this product?" 
      : "Are you sure you want to add this product?";
    
    if (!confirm(confirmMessage)) return;
    
    // Auto-generate SKU if not provided
    const sku = formData.sku || generateSKU();
    
    const productData = {
      name: formData.name,
      description: formData.description || null,
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: parseFloat(formData.stock_quantity),
      category: formData.category || null,
      quantity_type: formData.quantity_type,
      sku: sku,
      supplier_name: formData.supplier_name || null,
      image_url: formData.image_url || null,
    };

    setIsSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) {
          if (error.code === '23505') {
            toast.error("SKU already exists. Please use a different SKU.");
            return;
          }
          throw error;
        }
        toast.success("Product updated successfully!");
      } else {
        const { error } = await supabase.from("products").insert({ ...productData, owner_id: ownerId });
        if (error) {
          if (error.code === '23505') {
            toast.error("SKU already exists. Please use a different SKU.");
            return;
          }
          throw error;
        }
        toast.success("Product added successfully!");
      }
      
      await fetchProducts();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save product");
    } finally {
      setIsSaving(false);
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
      sku: product.sku || "",
      supplier_name: product.supplier_name || "",
      image_url: product.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!editingProduct) return;
    
    // PERMISSION CHECK
    if (!canDelete) {
      toast.error("You do not have permission to delete products.");
      return;
    }
    
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
      sku: "",
      supplier_name: "",
      image_url: "",
    });
    setEditingProduct(null);
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) return <Badge variant="destructive">{t("outOfStock")}</Badge>;
    if (quantity < 10) return <Badge variant="secondary" className="bg-warning text-warning-foreground">{t("lowStock")}</Badge>;
    return <Badge className="bg-success text-success-foreground">{t("inStock")}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedLogoLoader size="lg" showMessage message={t("loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("inventoryManagement")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("manageProductsQR")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          {selectedProducts.size > 0 && (
            <Button 
              onClick={() => setShowBatchQR(true)} 
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t("printQR")} ({selectedProducts.size})
            </Button>
          )}
          {canCreate && (
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              disabled={isLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? t("loading") : t("importCSV")}
            </Button>
          )}
          <Button 
            onClick={() => exportInventoryToCSV(filteredProducts)} 
            variant="outline"
            disabled={isLoading || filteredProducts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("exportCSV")}
          </Button>
          <Button onClick={fetchProducts} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) {
                resetForm();
              }
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addProduct")}
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t("editProduct") : t("addNewProduct")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Product Image */}
                <div className="md:row-span-2 space-y-2">
                  <Label>{t("productImage")}</Label>
                  <ProductImageUpload
                    currentImageUrl={formData.image_url}
                    onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                    onImageRemoved={() => setFormData({ ...formData, image_url: "" })}
                  />
                </div>
                
                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                
                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Product Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                      placeholder="Auto-generated if empty"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setFormData({ ...formData, sku: generateSKU() })}
                      title="Generate SKU"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
                
                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Supplier Name</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    placeholder="Enter supplier name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="quantity_type">Quantity Type *</Label>
                  <Input
                    id="quantity_type"
                    required
                    list="quantity-type-options"
                    value={formData.quantity_type}
                    onChange={(e) => setFormData({ ...formData, quantity_type: e.target.value })}
                    placeholder="Type or select quantity type"
                  />
                  <datalist id="quantity-type-options">
                    <option value="Meter" />
                    <option value="Than" />
                    <option value="Suit" />
                    <option value="Unit" />
                    <option value="Piece" />
                    <option value="Kg" />
                  </datalist>
                </div>
              </div>

              <div className="flex gap-2">
                {(editingProduct ? canEdit : canCreate) && (
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
                )}
                {editingProduct && canDelete && (
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
          )}
        </div>
      </div>

      {/* Stock Stats Cards - Mobile Single Column */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 w-full">
        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-sm font-semibold tracking-wide truncate">Stock Cost</CardTitle>
            <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center ring-2 ring-destructive/5 shrink-0">
              <PackageSearch className="h-3.5 w-3.5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{formatCurrency(stockStats.stockCost)}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Total purchase cost</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-sm font-semibold tracking-wide truncate">Stock Sell Worth</CardTitle>
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/5 shrink-0">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{formatCurrency(stockStats.stockSellWorth)}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Total selling price value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-sm font-semibold tracking-wide truncate">Sell Profit</CardTitle>
            <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center ring-2 ring-success/5 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-success tracking-tight truncate">{formatCurrency(stockStats.sellProfit)}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Potential profit margin</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-sm font-semibold tracking-wide truncate">Total Stock</CardTitle>
            <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center ring-2 ring-accent/5 shrink-0">
              <PackageSearch className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Unit:</span>
                <span className="text-sm font-bold text-foreground">{stockStats.totalStockByType.Unit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Than:</span>
                <span className="text-sm font-bold text-foreground">{stockStats.totalStockByType.Than}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Suit:</span>
                <span className="text-sm font-bold text-foreground">{stockStats.totalStockByType.Suit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Meter:</span>
                <span className="text-sm font-bold text-foreground">{stockStats.totalStockByType.Meter}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-sm font-semibold tracking-wide truncate">Products Overview</CardTitle>
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/5 shrink-0">
              <Package className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Products</p>
                <div className="text-xl font-bold text-foreground tracking-tight">{stockStats.totalProducts}</div>
              </div>
              <div className="pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">Low Stock Items</p>
                <div className="text-xl font-bold text-destructive tracking-tight">{stockStats.lowStockCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Mobile Optimized */}
      <Card className="p-4">
        <div className="mobile-filter-row mb-4">
          <div>
            <Label className="text-xs md:text-sm">Search by Name, SKU, Category or Supplier</Label>
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
            <Label className="text-xs md:text-sm">Filter by Category</Label>
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

      {/* Products List - Mobile Cards or Desktop Table */}
      {isMobile ? (
        // Mobile Card Layout
        <div className="space-y-3 w-full">
          {filteredProducts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground w-full">
              No products found
            </Card>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="p-3 active:scale-[0.98] transition-transform w-full overflow-hidden">
                <div className="flex items-start gap-3 w-full">
                  {/* Product Image */}
                  <div className="shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-foreground truncate">{product.name}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {product.category || "Uncategorized"} • {product.sku || "No SKU"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {getStockBadge(product.stock_quantity)}
                      </div>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Purchase</p>
                        <p className="text-xs font-medium truncate">Rs. {product.purchase_price.toFixed(0)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Selling</p>
                        <p className="text-xs font-semibold text-success truncate">Rs. {product.selling_price.toFixed(0)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Stock</p>
                        <p className="text-xs font-semibold truncate">{product.stock_quantity} {product.quantity_type}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <Checkbox
                    className="h-4 w-4"
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedProducts);
                      if (checked) {
                        newSelected.add(product.id);
                      } else {
                        newSelected.delete(product.id);
                      }
                      setSelectedProducts(newSelected);
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <ProductQRCode 
                      productId={product.id} 
                      productName={product.name}
                      sku={product.sku || undefined}
                    />
                    {canEdit && (
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => handleEdit(product)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table Layout
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                        } else {
                          setSelectedProducts(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => (
                  <TableRow key={product.id} className={selectedProducts.has(product.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedProducts);
                          if (checked) {
                            newSelected.add(product.id);
                          } else {
                            newSelected.delete(product.id);
                          }
                          setSelectedProducts(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {product.sku || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.category || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{product.supplier_name || "-"}</TableCell>
                    <TableCell className="text-right">Rs. {product.purchase_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-success font-semibold">
                      Rs. {product.selling_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {product.stock_quantity} <span className="text-xs text-muted-foreground">{product.quantity_type}</span>
                    </TableCell>
                    <TableCell className="text-center">{getStockBadge(product.stock_quantity)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <ProductQRCode 
                          productId={product.id} 
                          productName={product.name}
                          sku={product.sku || undefined}
                        />
                        {canEdit && (
                          <Button size="icon" variant="outline" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Batch QR Print Dialog */}
      <BatchQRPrint
        selectedProducts={filteredProducts.filter(p => selectedProducts.has(p.id))}
        isOpen={showBatchQR}
        onClose={() => setShowBatchQR(false)}
      />
    </div>
  );
};

export default Inventory;