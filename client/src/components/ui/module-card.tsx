import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  volumePercentage: number;
  serviceProvider: string;
  responseTime: string | number;
  successRate: string | number;
  iconBgColor: string;
  iconColor: string;
  barColor: string;
}

const ModuleCard = ({
  id,
  title,
  icon: Icon,
  isActive: initialIsActive,
  volumePercentage,
  serviceProvider,
  responseTime,
  successRate,
  iconBgColor,
  iconColor,
  barColor,
}: ModuleCardProps) => {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const handleToggleActive = async () => {
    setIsPending(true);
    try {
      const newStatus = !isActive;
      
      // Update module status via API
      await apiRequest("PUT", `/api/modules/${id}/status`, {
        status: newStatus ? "operational" : "inactive"
      });
      
      setIsActive(newStatus);
      
      toast({
        title: newStatus ? "Module Activated" : "Module Deactivated",
        description: `${title} has been ${newStatus ? "activated" : "deactivated"} successfully.`,
        variant: "default",
      });
      
      // Invalidate queries that depend on module status
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
      
    } catch (error) {
      toast({
        title: "Error Updating Module",
        description: "Failed to update module status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="module-card transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${iconBgColor}`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <h3 className="ml-3 text-lg font-medium text-neutral-800">
              {title}
            </h3>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggleActive}
            disabled={isPending}
          />
        </div>
        <div className={`mb-4 ${!isActive ? "opacity-50" : ""}`}>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-neutral-500">
              {title === "Voice Call Handling" 
                ? "Call Volume" 
                : title === "Email Management" 
                ? "Email Volume" 
                : title === "Live Chat" 
                ? "Chat Volume" 
                : title === "WhatsApp Business" 
                ? "Message Volume" 
                : title === "Calendar & Scheduling" 
                ? "Booking Volume" 
                : "Query Volume"}
            </span>
            <span className="text-xs font-medium text-neutral-700">
              {volumePercentage}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className={`${barColor} h-2 rounded-full`}
              style={{ width: `${volumePercentage}%` }}
            ></div>
          </div>
        </div>
        <div className={`flex justify-between text-sm ${!isActive ? "opacity-50" : ""}`}>
          <div>
            <p className="text-neutral-500">Service Provider</p>
            <p className="font-medium text-neutral-800">{serviceProvider}</p>
          </div>
          <div>
            <p className="text-neutral-500">Response Time</p>
            <p className="font-medium text-neutral-800">
              {responseTime === "N/A" ? "N/A" : `${responseTime}ms`}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Success Rate</p>
            <p className="font-medium text-neutral-800">
              {successRate === "N/A" ? "N/A" : `${successRate}%`}
            </p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-neutral-200">
          <a
            href={`/${id.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-primary font-medium text-sm hover:text-primary-dark"
          >
            Configure Settings
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleCard;
