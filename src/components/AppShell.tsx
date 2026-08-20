"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AppShell({
  nav,
  children,
}: {
  nav: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/login" || pathname === "/setup";

  if (hideSidebar) {
    return <main className="flex-1 min-h-screen w-full">{children}</main>;
  }

  return (
    <>
      {nav}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/10 py-6 text-center text-xs text-neutral-500">
          Best Employee Recognition &amp; Performance Excellence Process ·
          Version 1.0 · Owner: HR Department
        </footer>
      </div>
    </>
  );
}