import DashboardLayout from "@/components/layout/dashboard-layout";
import SystemStats from "@/components/dashboard/system-stats";
import SystemStatus from "@/components/dashboard/system-status";
import ModuleGrid from "@/components/dashboard/module-grid";
import RecentActivity from "@/components/dashboard/recent-activity";

const Dashboard = () => {
  return (
    <DashboardLayout>
      {/* System Stats */}
      <SystemStats />
      
      {/* System Status */}
      <SystemStatus />
      
      {/* Active Modules */}
      <ModuleGrid />
      
      {/* Recent Activity */}
      <RecentActivity />
    </DashboardLayout>
  );
};

export default Dashboard;
