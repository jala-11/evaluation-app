import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getRoleByKey,
  listAllRoleCriteria,
  listEmployees,
  listEvaluationsForPeriod,
  listTeams,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";
import { buildCriteriaMaps, buildExistingEvaluations } from "@/lib/roleCriteriaHelpers";
import RoleDashboard from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role: roleKey } = await params;
  const label = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  return {
    title: `${label} Dashboard | Best Employee Recognition`,
  };
}

export default async function RoleDashboardPage({
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

  const period = currentPeriod();
  const teams = await listTeams();
  const employees = await listEmployees();
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
          {role.name} Dashboard
        </h1>
        <Link href={`/dashboard/${role.key}/teams`} className="text-sm underline">
          Browse by team
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-8">
        Submit {role.name} evaluations for {period}.{" "}
        {role.scope === "per_team"
          ? "Criteria adapt to each employee's team."
          : "Other roles submit their sections separately."}
      </p>
      <RoleDashboard
        roleKey={role.key}
        roleName={role.name}
        scope={role.scope}
        criteriaFixed={criteriaFixed}
        criteriaByTeam={criteriaByTeam}
        teams={teams}
        employees={employees}
        existingRatings={existingRatings}
        existingDocuments={existingDocuments}
      />
    </div>
  );
}