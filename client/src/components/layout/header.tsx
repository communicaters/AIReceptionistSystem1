import { useLocation } from "wouter";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  setIsMobileOpen: (isOpen: boolean) => void;
}

const Header = ({ setIsMobileOpen }: HeaderProps) => {
  const [location] = useLocation();
  
  // Get the current page title based on the location
  const getPageTitle = () => {
    const path = location.split("/")[1];
    
    if (!path) return "Dashboard";
    
    // Convert kebab-case to title case
    return path
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="text-neutral-500 hover:text-neutral-700"
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
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </Button>
        </div>
        <div className="flex items-center">
          <span className="text-xl font-semibold text-neutral-800 hidden sm:block">
            {getPageTitle()}
          </span>
        </div>
        <div className="flex items-center">
          <div className="relative mr-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-700"
            >
              <span className="absolute -top-1 -right-1 bg-error text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                3
              </span>
              <Bell className="h-6 w-6" />
            </Button>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center hover:bg-neutral-100 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User profile" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium text-neutral-700 hidden md:block">
                John Smith
              </span>
              <ChevronDown className="w-5 h-5 ml-1 text-neutral-400" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
