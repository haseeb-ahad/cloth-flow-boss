import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface CustomerData {
  name: string;
  totalSpent: number;
  orders: number;
}

interface TopCustomersChartProps {
  data: CustomerData[];
  title: string;
  valuesHidden: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
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
            Spent: <span className="font-medium text-foreground">{valuesHidden ? "••••••" : `PKR ${data.totalSpent.toLocaleString()}`}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Orders: <span className="font-medium text-foreground">{valuesHidden ? "••" : data.orders}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const TopCustomersChart = ({ data, title, valuesHidden }: TopCustomersChartProps) => {
  const topData = data.slice(0, 5);

  if (!topData || topData.length === 0) {
    return (
      <Card className="hover:shadow-xl transition-all duration-300 border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-info" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">No customer data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-info" />
          </div>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Top 5 customers by spending</p>
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
                dataKey="totalSpent" 
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

export default TopCustomersChart;
