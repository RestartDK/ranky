import { redirect } from "next/navigation";
import { SignIn } from "@/components/sign-in";
import { getSession } from "@/lib/session";

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <SignIn />
  );
}
