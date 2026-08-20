import type { Metadata } from "next";
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
import TeamResultsTable from "@/components/TeamResultsTable";

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
  const criteria = role.scope === "fixed" ? criteriaFixed : (criteriaByTeam[team.id] ?? []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        {role.name} Dashboard — {team.name}
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Submitted {role.name} evaluations for {team.name} — {period}.
      </p>
      <TeamResultsTable
        roleKey={role.key}
        criteria={criteria}
        employees={employees}
        existingRatings={existingRatings}
        existingDocuments={existingDocuments}
      />
    </div>
  );
}