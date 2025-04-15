import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { LucideProps } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className="flex items-center justify-center">
      <Loader2 
        className={cn(
          "animate-spin text-muted-foreground", 
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
}