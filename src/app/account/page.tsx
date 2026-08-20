import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AccountForm from "./AccountForm";

export const metadata: Metadata = {
  title: "Account | Best Employee Recognition",
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Account</h1>
      <p className="text-sm text-neutral-600 mb-8">
        Update your profile info and password.
      </p>
      <AccountForm
        name={session.name}
        email={session.email}
        roleName={session.roleName}
      />
    </div>
  );
}