import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "STUDENT" ? "/dashboard" : "/admin");
  return <RegisterForm />;
}
