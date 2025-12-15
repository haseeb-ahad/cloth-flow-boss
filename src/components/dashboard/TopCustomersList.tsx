import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface CustomerData {
  name: string;
  totalSpent: number;
  orders: number;
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

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-green-500",
  "bg-lime-500",
];

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
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-medium`}>
                {getInitials(customer.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {customer.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {valuesHidden ? "••" : customer.orders} orders
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {valuesHidden ? "••••" : customer.orders}
              </p>
              <p className="text-xs text-muted-foreground">sales</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopCustomersList;
