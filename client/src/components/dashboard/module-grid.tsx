import { useQuery } from "@tanstack/react-query";
import ModuleCard from "@/components/ui/module-card";
import { Phone, Mail, MessageCircle, MessageSquare, Calendar, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleData {
  name: string;
  status: string;
  responseTime: number | null;
  successRate: number | null;
  lastChecked: string;
}

const ModuleGrid = () => {
  const { data: modules, isLoading, error } = useQuery<ModuleData[]>({
    queryKey: ["/api/system/status"],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">Active Modules</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">Active Modules</h2>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Failed to load modules. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Define module configurations
  const moduleConfigs = [
    {
      id: "Voice Call Handling",
      icon: Phone,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      barColor: "bg-primary",
      volumePercentage: 85,
      serviceProvider: "Twilio",
    },
    {
      id: "Email Management",
      icon: Mail,
      iconBgColor: "bg-indigo-100",
      iconColor: "text-indigo-600",
      barColor: "bg-indigo-500",
      volumePercentage: 62,
      serviceProvider: "SendGrid",
    },
    {
      id: "Live Chat",
      icon: MessageCircle,
      iconBgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      barColor: "bg-purple-500",
      volumePercentage: 73,
      serviceProvider: "Custom Widget",
    },
    {
      id: "WhatsApp Business",
      icon: MessageSquare,
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
      barColor: "bg-green-500",
      volumePercentage: 0,
      serviceProvider: "WhatsApp API",
    },
    {
      id: "Calendar & Scheduling",
      icon: Calendar,
      iconBgColor: "bg-pink-100",
      iconColor: "text-pink-600",
      barColor: "bg-pink-500",
      volumePercentage: 48,
      serviceProvider: "Google Calendar",
    },
    {
      id: "Product & Pricing",
      icon: Database,
      iconBgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      barColor: "bg-amber-500",
      volumePercentage: 37,
      serviceProvider: "Shopify",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-neutral-800">Active Modules</h2>
        <Button className="bg-primary hover:bg-primary-dark text-white flex items-center">
          <Plus className="mr-1 h-5 w-5" />
          Add Module
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moduleConfigs.map((config) => {
          const moduleData = modules?.find(m => m.name === config.id);
          const isActive = moduleData?.status === "operational" || moduleData?.status === "degraded";
          
          return (
            <ModuleCard
              key={config.id}
              id={config.id}
              title={config.id}
              icon={config.icon}
              isActive={isActive}
              volumePercentage={config.volumePercentage}
              serviceProvider={config.serviceProvider}
              responseTime={moduleData?.responseTime ?? "N/A"}
              successRate={moduleData?.successRate ?? "N/A"}
              iconBgColor={config.iconBgColor}
              iconColor={config.iconColor}
              barColor={config.barColor}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ModuleGrid;
