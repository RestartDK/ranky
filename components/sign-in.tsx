"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { RankyIcon } from "@/components/ranky-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignIn() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2">
          <RankyIcon className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">ranky</span>
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle className="text-lg">
              {isSignUp ? "Create an account" : "Welcome back"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading…" : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => setIsSignUp((value) => !value)}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
