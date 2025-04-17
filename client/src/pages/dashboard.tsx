import SystemStats from "@/components/dashboard/system-stats";
import SystemStatus from "@/components/dashboard/system-status";
import ModuleGrid from "@/components/dashboard/module-grid";
import RecentActivity from "@/components/dashboard/recent-activity";
import { WebSocketMonitor } from "@/components/dashboard/websocket-monitor";

const Dashboard = () => {
  return (
    <>
      {/* System Stats */}
      <SystemStats />
      
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="md:col-span-2">
          {/* System Status */}
          <SystemStatus />
        </div>
        <div className="md:col-span-1">
          {/* WebSocket Connection Monitor */}
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">Connection Monitor</h2>
          <WebSocketMonitor />
        </div>
      </div>
      
      {/* Active Modules */}
      <ModuleGrid />
      
      {/* Recent Activity */}
      <RecentActivity />
    </>
  );
};

export default Dashboard;
