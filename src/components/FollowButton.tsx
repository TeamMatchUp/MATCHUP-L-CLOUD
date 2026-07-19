import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string | null | undefined;
  size?: "sm" | "default" | "lg";
  className?: string;
  variant?: "default" | "compact";
}

export function FollowButton({ targetUserId, size = "sm", className, variant = "default" }: FollowButtonProps) {
  const { user } = useAuth();
  const { open } = useAuthModal();
  const { isFollowing, toggle, loading } = useFollow(targetUserId);

  if (!targetUserId) return null;
  if (user && user.id === targetUserId) return null;

  const label = isFollowing ? "Following" : "Follow";
  const Icon = isFollowing ? UserMinus : UserPlus;

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "hero"}
      disabled={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) { open("signin"); return; }
        void toggle();
      }}
      className={cn("gap-1.5", variant === "compact" && "h-8 px-3 text-xs", className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
