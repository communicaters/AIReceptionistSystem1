import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  changeValue?: number;
  changeText?: string;
  iconBgColor: string;
  iconColor: string;
}

const StatsCard = ({
  title,
  value,
  icon,
  changeValue,
  changeText,
  iconBgColor,
  iconColor,
}: StatsCardProps) => {
  const isPositive = changeValue && changeValue > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${iconBgColor}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-5">
            <p className="text-neutral-500 text-sm font-medium">{title}</p>
            <h2 className="text-2xl font-bold text-neutral-800">{value}</h2>
          </div>
        </div>
        {changeValue !== undefined && changeText && (
          <div className="mt-4">
            <span
              className={`${
                isPositive ? "text-success" : "text-error"
              } text-sm font-medium flex items-center`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              {changeText}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
