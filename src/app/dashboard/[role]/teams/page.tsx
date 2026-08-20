import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRoleByKey, listEmployees, listTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role: roleKey } = await params;
  const label = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  return {
    title: `${label} — Teams | Best Employee Recognition`,
  };
}

export default async function RoleTeamsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleKey } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const role = await getRoleByKey(roleKey);
  if (!role) redirect(`/dashboard/${session.roleKey}`);
  if (session.roleKey !== role.key) redirect(`/dashboard/${session.roleKey}`);

  const teams = await listTeams();
  const employees = await listEmployees();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {role.name} Dashboard — Teams
        </h1>
        <Link href={`/dashboard/${role.key}`} className="text-sm underline">
          All employees
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Pick a team to evaluate just its employees.
      </p>

      <ul className="divide-y divide-black/5 rounded-lg border border-black/10">
        {teams.map((team) => {
          const count = employees.filter((e) => e.team_id === team.id).length;
          return (
            <li key={team.id}>
              <Link
                href={`/dashboard/${role.key}/team/${team.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">
                  {team.name}
                </span>
                <span className="flex items-center gap-2 text-neutral-500">
                  {count} {count === 1 ? "employee" : "employees"}
                  <ArrowRight size={14} />
                </span>
              </Link>
            </li>
          );
        })}
        {teams.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No teams yet.
          </li>
        )}
      </ul>
    </div>
  );
}