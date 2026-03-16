import Link from "next/link";
import type { getSession } from "@/lib/session";
import { RankyIcon } from "@/components/ranky-icon";
import { UserMenu } from "@/components/user-menu";

export function Header({
  session,
}: {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <RankyIcon className="size-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">ranky</span>
        </Link>
        <UserMenu name={session.user.name} />
      </div>
    </header>
  );
}
