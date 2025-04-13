import { Link, useLocation } from "wouter";
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Calendar,
  Database,
  Monitor,
  Mic,
  Settings,
  HelpCircle,
  LogOut,
  Home,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const handleMobileToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <aside
      className={`w-64 bg-neutral-800 text-white fixed h-full overflow-auto lg:static z-20 transition-all duration-300 transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:transform-none`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-primary"
          >
            <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 01-.659 1.591L9 14.5m0 0l3-3m-3 3l-3-3m12 1.5v-5.5a2.25 2.25 0 00-.659-1.591L18 6.5m-6-3V3m0 0a2.25 2.25 0 012.25 2.25M12 3v3" />
          </svg>
          <span className="ml-2 text-lg font-semibold">AI Receptionist</span>
        </div>
        <button
          id="mobile-toggle"
          className="lg:hidden"
          onClick={handleMobileToggle}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav className="mt-4">
        <div className="px-4 py-2 text-neutral-400 text-xs uppercase font-semibold">
          Main
        </div>
        <Link href="/">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="ml-3">Dashboard</span>
          </a>
        </Link>

        <Link href="/settings">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/settings")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="ml-3">System Settings</span>
          </a>
        </Link>

        <div className="px-4 py-2 mt-4 text-neutral-400 text-xs uppercase font-semibold">
          Modules
        </div>

        <Link href="/voice-call">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/voice-call")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="ml-3">Voice Call Handling</span>
          </a>
        </Link>

        <Link href="/email-management">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/email-management")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="ml-3">Email Management</span>
          </a>
        </Link>

        <Link href="/live-chat">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/live-chat")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="ml-3">Live Chat</span>
          </a>
        </Link>

        <Link href="/whatsapp">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/whatsapp")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="ml-3">WhatsApp Business</span>
          </a>
        </Link>

        <Link href="/calendar">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/calendar")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="ml-3">Calendar & Scheduling</span>
          </a>
        </Link>

        <Link href="/products">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/products")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="ml-3">Product & Pricing</span>
          </a>
        </Link>

        <Link href="/ai-training">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/ai-training")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="ml-3">AI Core & Training</span>
          </a>
        </Link>

        <Link href="/speech-engines">
          <a
            className={`flex items-center px-4 py-3 ${
              isActive("/speech-engines")
                ? "text-white bg-primary hover:bg-primary-dark"
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <Mic className="w-5 h-5" />
            <span className="ml-3">Speech Engines</span>
          </a>
        </Link>

        <div className="px-4 py-2 mt-4 text-neutral-400 text-xs uppercase font-semibold">
          More
        </div>
        <a
          href="#"
          className="flex items-center px-4 py-3 text-neutral-300 hover:bg-neutral-700"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="ml-3">Help & Support</span>
        </a>
        <a
          href="#"
          className="flex items-center px-4 py-3 text-neutral-300 hover:bg-neutral-700"
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-3">Logout</span>
        </a>
      </nav>
    </aside>
  );
};

export default Sidebar;
