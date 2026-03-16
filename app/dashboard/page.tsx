import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header session={session} />
      <Dashboard />
    </div>
  );
}
