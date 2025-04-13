import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Calendar,
  Database,
  Monitor,
  Mic,
} from "lucide-react";

interface ModuleStatus {
  id: number;
  name: string;
  status: string;
  responseTime: number | null;
  successRate: number | null;
  lastChecked: string;
  details: string | null;
}

const SystemStatus = () => {
  const { data: moduleStatuses, isLoading, error } = useQuery<ModuleStatus[]>({
    queryKey: ["/api/system/status"],
  });

  const moduleIcons: Record<string, any> = {
    "Voice Call Handling": Phone,
    "Email Management": Mail,
    "Live Chat": MessageCircle,
    "WhatsApp Business": MessageSquare,
    "Calendar & Scheduling": Calendar,
    "Product & Pricing": Database,
    "AI Core & Training": Monitor,
    "Speech Engines": Mic,
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">System Status</h2>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">System Status</h2>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Failed to load system status. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-neutral-800 mb-4">System Status</h2>
      <Card>
        <div className="border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-medium">Module Health</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {moduleStatuses?.map((module) => {
                const Icon = moduleIcons[module.name] || Phone;
                
                return (
                  <tr key={module.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 text-neutral-600 mr-3" />
                        <span className="font-medium text-neutral-800">{module.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={module.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {module.responseTime ? `${module.responseTime}ms` : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {module.lastChecked 
                        ? `${formatDistanceToNow(new Date(module.lastChecked))} ago` 
                        : "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/${module.name.toLowerCase().replace(/\s+/g, "-")}`}
                        className={module.status === "outage" 
                          ? "text-error hover:text-red-800" 
                          : "text-primary hover:text-primary-dark"}
                      >
                        {module.status === "outage" ? "Troubleshoot" : "View Details"}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SystemStatus;
