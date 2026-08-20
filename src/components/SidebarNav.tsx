"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calculator,
  ChevronDown,
  ClipboardList,
  Home,
  LogIn,
  Network,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
  UserCog,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";

type Team = { id: number; name: string };

function NavItem({
  href,
  icon,
  label,
  active,
  indent = false,
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md py-2.5 text-sm font-medium ${
        indent ? "pl-11 pr-3" : "px-3"
      } ${
        active
          ? "bg-accent/10 text-accent"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
      }`}
    >
      {icon && (
        <span className={active ? "text-accent" : "text-neutral-400"}>{icon}</span>
      )}
      {label}
    </Link>
  );
}

function GroupHeader({
  icon,
  label,
  open,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
    >
      <span className="flex items-center gap-3">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </span>
      <ChevronDown
        size={16}
        className={`text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
      />
    </button>
  );
}

export default function SidebarNav({
  roleKey,
  roleName,
  isAdmin,
  name,
}: {
  roleKey: string | null;
  roleName: string | null;
  isAdmin: boolean;
  name: string | null;
}) {
  const pathname = usePathname();
  const [teams, setTeams] = useState<Team[]>([]);

  // Teams for the per-role "Dashboard / <team name>" submenu are fetched
  // client-side (rather than in the server-rendered Nav) so this request
  // happens after the page's own server render has already completed,
  // instead of racing it as a second concurrent database query.
  useEffect(() => {
    if (!roleKey) return;
    let cancelled = false;
    fetch("/api/teams")
      .then((res) => (res.ok ? res.json() : { teams: [] }))
      .then((data) => {
        if (!cancelled) setTeams(data.teams ?? []);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, [roleKey]);

  const dashboardActive = roleKey ? pathname.startsWith(`/dashboard/${roleKey}`) : false;
  const settingsActive = pathname === "/account" || pathname.startsWith("/hr/");

  const [dashboardOpen, setDashboardOpen] = useState(dashboardActive);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  // Auto-expand a group when navigation lands on one of its pages (e.g. the
  // login redirect landing straight on /dashboard/<role>), without fighting
  // a group the user has manually opened. Adjusting state from a change
  // detected during render (rather than in an effect) is the pattern React
  // recommends for "reset/expand state when a prop changes" — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevDashboardActive, setPrevDashboardActive] = useState(dashboardActive);
  if (dashboardActive !== prevDashboardActive) {
    setPrevDashboardActive(dashboardActive);
    if (dashboardActive) setDashboardOpen(true);
  }
  const [prevSettingsActive, setPrevSettingsActive] = useState(settingsActive);
  if (settingsActive !== prevSettingsActive) {
    setPrevSettingsActive(settingsActive);
    if (settingsActive) setSettingsOpen(true);
  }

  // "Dashboard": every evaluator role (built-in or HR-created) gets
  // "Evaluation" (the full rating form) plus one entry per team — clicking
  // a team shows the submitted results for just that team's employees.
  const dashboardChildren = roleKey
    ? [
        {
          href: `/dashboard/${roleKey}`,
          icon: <ClipboardList size={16} />,
          label: "Evaluation",
          active: pathname === `/dashboard/${roleKey}`,
        },
        ...teams.map((team) => ({
          href: `/dashboard/${roleKey}/team/${team.id}`,
          icon: <Users size={16} />,
          label: team.name,
          active: pathname === `/dashboard/${roleKey}/team/${team.id}`,
        })),
      ]
    : [];

  // "Settings": every signed-in user can manage their own account; HR
  // additionally gets the admin pages for logins, teams, and roles.
  const settingsChildren = [
    { href: "/account", icon: <User size={16} />, label: "Account" },
    ...(isAdmin
      ? [
          { href: "/hr/users", icon: <UserCog size={16} />, label: "Manage logins" },
          { href: "/hr/teams", icon: <Network size={16} />, label: "Manage teams" },
          { href: "/hr/roles", icon: <ShieldCheck size={16} />, label: "Roles" },
        ]
      : []),
  ].map((item) => ({ ...item, active: pathname === item.href }));

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <NavItem href="/" icon={<Home size={18} />} label="Process" active={pathname === "/"} />
        <NavItem
          href="/calculator"
          icon={<Calculator size={18} />}
          label="Calculator"
          active={pathname === "/calculator"}
        />
        <NavItem
          href="/employees"
          icon={<Users size={18} />}
          label="Employees"
          active={pathname === "/employees"}
        />

        {isAdmin && (
          <NavItem
            href="/hr/results"
            icon={<BarChart3 size={18} />}
            label="Combined results"
            active={pathname === "/hr/results"}
          />
        )}

        {roleKey && (
          <div className="pt-1">
            <GroupHeader
              icon={<ShieldCheck size={18} />}
              label={`${roleName ?? roleKey} Dashboard`}
              open={dashboardOpen}
              onToggle={() => setDashboardOpen((v) => !v)}
            />
            {dashboardOpen && (
              <div className="ml-[1.15rem] border-l border-black/10 space-y-1.5 mt-1">
                {dashboardChildren.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={item.active}
                    indent
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {roleKey && (
          <div className="pt-1">
            <GroupHeader
              icon={<SettingsIcon size={18} />}
              label="Settings"
              open={settingsOpen}
              onToggle={() => setSettingsOpen((v) => !v)}
            />
            {settingsOpen && (
              <div className="ml-[1.15rem] border-l border-black/10 space-y-1.5 mt-1">
                {settingsChildren.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={item.active}
                    indent
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-black/10 px-3 py-4">
        {roleKey ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-sm text-neutral-600 truncate">{name}</span>
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
          >
            <LogIn size={18} />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}