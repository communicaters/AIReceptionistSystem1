import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import StatusBadge from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemActivity {
  id: number;
  module: string;
  event: string;
  status: string;
  timestamp: string;
  details: Record<string, any> | null;
}

const RecentActivity = () => {
  const { data: activities, isLoading, error } = useQuery<SystemActivity[]>({
    queryKey: ["/api/system/activity"],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Recent Activity</h2>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Recent Activity</h2>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Failed to load recent activity. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-neutral-800 mb-4">Recent Activity</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {activities?.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-800">
                      {activity.event}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-600">{activity.module}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={activity.status === "Completed" ? "operational" : activity.status === "Error" ? "outage" : "degraded"} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {formatDistanceToNow(new Date(activity.timestamp))} ago
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {activities?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-neutral-500">
                    No recent activities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <CardFooter className="px-6 py-4 border-t border-neutral-200 flex justify-end">
          <a href="#" className="text-primary hover:text-primary-dark text-sm font-medium">
            View All Activity →
          </a>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RecentActivity;
