import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, params] = await Promise.all([getSessionUser(), searchParams]);
  if (user) redirect(user.role === "STUDENT" ? "/dashboard" : "/admin");
  return <LoginForm next={params.next} demo={process.env.NODE_ENV !== "production"} />;
}
