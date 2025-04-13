import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/ui/stats-card";
import { Users, Mail, MessageCircle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  callsHandled: number;
  callsIncreasePercentage: number;
  emailsProcessed: number;
  emailsIncreasePercentage: number;
  chatConversations: number;
  chatChangePercentage: number;
  meetingsScheduled: number;
  meetingsIncreasePercentage: number;
}

// In a real application, this would come from the API
const mockStats: Stats = {
  callsHandled: 1284,
  callsIncreasePercentage: 12.5,
  emailsProcessed: 3752,
  emailsIncreasePercentage: 8.3,
  chatConversations: 946,
  chatChangePercentage: -3.2,
  meetingsScheduled: 527,
  meetingsIncreasePercentage: 15.7,
};

const SystemStats = () => {
  // In a real application, this data would come from an API
  // For now, we'll simulate a query to match the pattern
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ["/api/system/stats"],
    enabled: false, // Disable actual fetching since we're using mock data
    initialData: mockStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Failed to load system statistics. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatsCard
        title="Total Calls Handled"
        value={stats.callsHandled.toLocaleString()}
        icon={<Users className="w-6 h-6" />}
        changeValue={stats.callsIncreasePercentage}
        changeText={`${stats.callsIncreasePercentage}% increase`}
        iconBgColor="bg-primary-light bg-opacity-10"
        iconColor="text-primary"
      />

      <StatsCard
        title="Emails Processed"
        value={stats.emailsProcessed.toLocaleString()}
        icon={<Mail className="w-6 h-6" />}
        changeValue={stats.emailsIncreasePercentage}
        changeText={`${stats.emailsIncreasePercentage}% increase`}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />

      <StatsCard
        title="Chat Conversations"
        value={stats.chatConversations.toLocaleString()}
        icon={<MessageCircle className="w-6 h-6" />}
        changeValue={stats.chatChangePercentage}
        changeText={`${Math.abs(stats.chatChangePercentage)}% decrease`}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-600"
      />

      <StatsCard
        title="Meetings Scheduled"
        value={stats.meetingsScheduled.toLocaleString()}
        icon={<Calendar className="w-6 h-6" />}
        changeValue={stats.meetingsIncreasePercentage}
        changeText={`${stats.meetingsIncreasePercentage}% increase`}
        iconBgColor="bg-indigo-100"
        iconColor="text-indigo-600"
      />
    </div>
  );
};

export default SystemStats;
