import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
  trend?: number;
}

interface TopProductsListProps {
  data: ProductData[];
  title: string;
  subtitle: string;
  valuesHidden: boolean;
}

const TopProductsList = ({ data, title, subtitle, valuesHidden }: TopProductsListProps) => {
  const { t } = useLanguage();
  const topData = data.slice(0, 5);

  if (!topData || topData.length === 0) {
    return (
      <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">{t("noProductData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-3">
        {topData.map((product, index) => {
          // Generate random trend for demo
          const trend = Math.random() > 0.2 ? (Math.random() * 20).toFixed(1) : -(Math.random() * 5).toFixed(1);
          const isPositive = Number(trend) >= 0;
          
          return (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border/50">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {valuesHidden ? `•••• ${t("units")}` : `${product.quantity} ${t("units")}`}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-blue-500' : 'text-red-500'}`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{valuesHidden ? "••" : `${isPositive ? '+' : ''}${trend}%`}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TopProductsList;