import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsChartProps {
  data: ProductData[];
  title: string;
  valuesHidden: boolean;
}

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
];

const CustomTooltip = ({ active, payload, valuesHidden }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-1">{data.name}</p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Revenue: <span className="font-medium text-foreground">{valuesHidden ? "••••••" : `PKR ${data.revenue.toLocaleString()}`}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Quantity: <span className="font-medium text-foreground">{valuesHidden ? "••" : data.quantity}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const TopProductsChart = ({ data, title, valuesHidden }: TopProductsChartProps) => {
  const topData = data.slice(0, 5);

  if (!topData || topData.length === 0) {
    return (
      <Card className="hover:shadow-xl transition-all duration-300 border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-accent" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-accent" />
          </div>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Top 5 products by revenue</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={topData} 
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => valuesHidden ? "•••" : `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
              />
              <Tooltip content={<CustomTooltip valuesHidden={valuesHidden} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
              <Bar 
                dataKey="revenue" 
                radius={[0, 8, 8, 0]}
                animationDuration={1000}
                animationBegin={0}
              >
                {topData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopProductsChart;
