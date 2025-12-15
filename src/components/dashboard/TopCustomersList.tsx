import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface CustomerData {
  name: string;
  totalSpent: number;
  orders: number;
  profit: number;
}

interface TopCustomersListProps {
  data: CustomerData[];
  title: string;
  subtitle: string;
  valuesHidden: boolean;
}

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-green-500",
  "bg-lime-500",
];

const CHART_COLORS = [
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#22c55e",
  "#84cc16",
];

// Mini sparkline component for customer trends
const CustomerSparkline = ({ color, seed }: { color: string; seed: number }) => {
  const data = useMemo(() => {
    // Generate consistent random data based on seed
    const random = (n: number) => {
      const x = Math.sin(seed * n) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: 7 }, (_, i) => ({
      value: 20 + random(i + 1) * 80,
    }));
  }, [seed]);

  const gradientId = useMemo(() => `customer-spark-${seed}`, [seed]);

  return (
    <div className="h-8 w-16 overflow-hidden flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopCustomersList = ({ data, title, subtitle, valuesHidden }: TopCustomersListProps) => {
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
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">No customer data available</p>
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
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-3">
        {topData.map((customer, index) => (
          <div 
            key={index} 
            className="flex items-center p-3 rounded-lg hover:bg-muted/30 transition-colors gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <div className={`h-10 w-10 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                {getInitials(customer.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {customer.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {valuesHidden ? "••" : customer.orders} orders
                </p>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <CustomerSparkline 
                color={CHART_COLORS[index % CHART_COLORS.length]} 
                seed={index + 1} 
              />
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">
                {valuesHidden ? "••••••" : formatCurrency(customer.totalSpent)}
              </p>
              <p className="text-xs text-emerald-500 font-medium">
                {valuesHidden ? "••••" : formatCurrency(customer.profit)} profit
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopCustomersList;
