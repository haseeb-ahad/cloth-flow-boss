import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Store, MapPin, Phone, CheckCircle2, XCircle, Tag, Layers, Info } from "lucide-react";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface Product {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  stock_quantity: number;
  category: string | null;
  quantity_type: string;
  image_url: string | null;
  sku: string | null;
  supplier_name: string | null;
  owner_id: string | null;
}

interface ShopSettings {
  shop_name: string;
  shop_address: string;
  phone_numbers: string[];
  logo_url: string | null;
  description: string | null;
}

const PublicProduct = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const fetchProductData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to find product by SKU first, then by ID
      let productData: Product | null = null;
      
      // First try SKU lookup
      const { data: skuData, error: skuError } = await supabase
        .from("products")
        .select("*")
        .eq("sku", productId)
        .maybeSingle();

      if (skuData) {
        productData = skuData;
      } else {
        // Try ID lookup
        const { data: idData, error: idError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();

        if (idData) {
          productData = idData;
        }
      }

      if (!productData) {
        setError("Product not found");
        setIsLoading(false);
        return;
      }

      setProduct(productData);

      // Fetch shop settings for this product's owner
      if (productData.owner_id) {
        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("shop_name, shop_address, phone_numbers, logo_url, description")
          .eq("owner_id", productData.owner_id)
          .maybeSingle();

        if (settingsData) {
          setShopSettings(settingsData);
        }
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError("Failed to load product");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <AnimatedLogoLoader size="lg" showMessage message="Loading product..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground">
              The product you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInStock = product.stock_quantity > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Shop Header */}
      {shopSettings && (
        <header className="bg-card border-b shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              {shopSettings.logo_url ? (
                <img
                  src={shopSettings.logo_url}
                  alt={shopSettings.shop_name}
                  className="h-14 w-14 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {shopSettings.shop_name || "Shop"}
                </h1>
                {shopSettings.shop_address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {shopSettings.shop_address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Product Details */}
      <main className="max-w-2xl mx-auto p-4 py-8">
        <Card className="overflow-hidden shadow-lg">
          {/* Product Image */}
          {product.image_url ? (
            <div className="aspect-square w-full bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground/50" />
            </div>
          )}

          <CardContent className="p-6 space-y-6">
            {/* Product Name & Stock Status */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
                <Badge
                  variant={isInStock ? "default" : "destructive"}
                  className={isInStock ? "bg-green-500 hover:bg-green-600" : ""}
                >
                  {isInStock ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> In Stock</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Out of Stock</>
                  )}
                </Badge>
              </div>
              
              {product.category && (
                <Badge variant="secondary" className="font-normal">
                  <Tag className="h-3 w-3 mr-1" />
                  {product.category}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Price */}
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Price</span>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(product.selling_price)}
              </p>
              <p className="text-sm text-muted-foreground">
                per {product.quantity_type || "Unit"}
              </p>
            </div>

            <Separator />

            {/* Description */}
            {product.description && (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Description
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Product Details */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Product Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {product.sku && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground">SKU</span>
                    <p className="font-medium">{product.sku}</p>
                  </div>
                )}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <span className="text-xs text-muted-foreground">Stock</span>
                  <p className="font-medium">
                    {product.stock_quantity} {product.quantity_type || "Units"}
                  </p>
                </div>
                {product.supplier_name && (
                  <div className="bg-muted/50 p-3 rounded-lg col-span-2">
                    <span className="text-xs text-muted-foreground">Supplier</span>
                    <p className="font-medium">{product.supplier_name}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop Contact */}
        {shopSettings && shopSettings.phone_numbers && shopSettings.phone_numbers.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Shop</p>
                  <p className="font-medium">{shopSettings.phone_numbers[0]}</p>
                </div>
                <a
                  href={`tel:${shopSettings.phone_numbers[0]}`}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call Now
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Scan the QR code on product packaging to verify authenticity</p>
        </footer>
      </main>
    </div>
  );
};

export default PublicProduct;