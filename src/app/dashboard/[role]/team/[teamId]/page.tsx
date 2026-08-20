// src/app/dashboard/[role]/team/[teamId]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getRoleByKey,
  getTeam,
  listAllRoleCriteria,
  listEmployees,
  listEvaluationsForPeriod,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";
import { buildCriteriaMaps, buildExistingEvaluations } from "@/lib/roleCriteriaHelpers";
import RoleDashboard from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string; teamId: string }>;
}): Promise<Metadata> {
  const { role: roleKey } = await params;
  const label = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  return {
    title: `${label} Dashboard | Best Employee Recognition`,
  };
}

export default async function RoleTeamDashboardPage({
  params,
}: {
  params: Promise<{ role: string; teamId: string }>;
}) {
  const { role: roleKey, teamId: teamIdParam } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const role = await getRoleByKey(roleKey);
  if (!role) redirect(`/dashboard/${session.roleKey}`);
  if (session.roleKey !== role.key) redirect(`/dashboard/${session.roleKey}`);

  const teamId = Number(teamIdParam);
  if (!Number.isFinite(teamId)) notFound();
  const team = await getTeam(teamId);
  if (!team) notFound();

  const period = currentPeriod();
  const allEmployees = await listEmployees();
  const employees = allEmployees.filter((e) => e.team_id === team.id);
  const evaluations = await listEvaluationsForPeriod(period);
  const criteriaRows = await listAllRoleCriteria(role.id);

  const { criteriaFixed, criteriaByTeam } = buildCriteriaMaps(criteriaRows);
  const { existingRatings, existingDocuments } = buildExistingEvaluations(
    evaluations,
    role.id,
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {role.name} Dashboard — {team.name}
        </h1>
        <Link href={`/dashboard/${role.key}/teams`} className="text-sm underline">
          All teams
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Submit {role.name} evaluations for {team.name} — {period}.
      </p>
      <RoleDashboard
        roleKey={role.key}
        roleName={role.name}
        scope={role.scope}
        criteriaFixed={criteriaFixed}
        criteriaByTeam={criteriaByTeam}
        teams={[team]}
        employees={employees}
        existingRatings={existingRatings}
        existingDocuments={existingDocuments}
      />
    </div>
  );
}