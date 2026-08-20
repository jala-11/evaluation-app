import type { Metadata } from "next";
import Nav from "@/components/Nav";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Best Employee Recognition & Performance Excellence",
  description:
    "Standardized, fair, and transparent framework for employee recognition, performance rewards, increment discussions, and promotion readiness.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-white text-black">
        <AppShell nav={<Nav />}>{children}</AppShell>
      </body>
    </html>
  );
}