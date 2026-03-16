"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-8 rounded-full bg-primary/10 p-0 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          {getInitials(name)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="gap-2">
          <SignOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
