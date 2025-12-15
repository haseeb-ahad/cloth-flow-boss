import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import SparklineChart from "./SparklineChart";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  sparklineData: { value: number }[];
  sparklineColor: string;
  dateRangeLabel: string;
  animationDelay?: string;
  gradientId: string;
}

const KPICard = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  sparklineData,
  sparklineColor,
  dateRangeLabel,
  animationDelay = "0ms",
  gradientId,
}: KPICardProps) => {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 animate-in overflow-hidden group" 
      style={{ animationDelay }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-10 w-10 rounded-xl ${iconBgColor} flex items-center justify-center ring-4 ring-opacity-5 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${iconColor}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{dateRangeLabel}</p>
        <SparklineChart 
          data={sparklineData} 
          color={sparklineColor} 
          gradientId={gradientId}
        />
      </CardContent>
    </Card>
  );
};

export default KPICard;
