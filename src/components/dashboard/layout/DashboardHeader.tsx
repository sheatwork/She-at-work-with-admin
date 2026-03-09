/*eslint-disable @typescript-eslint/no-explicit-any */
// src/components/dashboard/layout/DashboardHeader.tsx
"use client";

import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  user: any;
  role: string;
}

// Role badge config — matches UserRole enum: SUPER_ADMIN | ADMIN | USER
const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "bg-gradient-to-r from-primary via-primary/90 to-purple-600 text-primary-foreground",
  },
  ADMIN: {
    label: "Admin",
    color: "bg-gradient-to-r from-accent to-pink-600 text-accent-foreground",
  },
  USER: {
    label: "User",
    color: "bg-gradient-to-r from-muted to-muted/80 text-muted-foreground",
  },
};

export default function DashboardHeader({ user, role }: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
  };

  const roleInfo = ROLE_BADGES[role] ?? ROLE_BADGES.USER;

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">SheAtWork Dashboard</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full hover:bg-secondary/20 transition-colors"
            >
              <Avatar className="h-10 w-10 border-2 border-border">
                <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/profile")}
              className="text-foreground hover:text-primary hover:bg-secondary/20  cursor-pointer"
            >
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-accent hover:text-primary hover:bg-accent/10  cursor-pointer font-medium"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}