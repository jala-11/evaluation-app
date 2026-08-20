import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getRoleByKey,
  listAllRoleCriteria,
  listEligibilityForPeriod,
  listEmployees,
  listEvaluationsForPeriod,
} from "@/lib/data";
import { currentPeriod } from "@/lib/db";
import { buildCriteriaMaps, buildExistingEvaluations } from "@/lib/roleCriteriaHelpers";
import type { EligibilityKey } from "@/lib/scoring";
import EvaluationForm from "@/components/EvaluationForm";

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
  const employees = await listEmployees();
  const evaluations = await listEvaluationsForPeriod(period);
  const criteriaRows = await listAllRoleCriteria(role.id);

  const { criteriaFixed, criteriaByTeam } = buildCriteriaMaps(criteriaRows);
  const { existingRatings, existingDocuments } = buildExistingEvaluations(
    evaluations,
    role.id,
  );

  // Eligibility (Section 5) is HR-only — the same checklist gates whether an
  // employee can qualify for the award regardless of who's evaluating them.
  const existingEligibility: Record<number, Partial<Record<EligibilityKey, boolean>>> = {};
  if (role.is_admin) {
    const eligibilityRows = await listEligibilityForPeriod(period);
    for (const row of eligibilityRows) {
      existingEligibility[row.employee_id] = {
        minService: row.min_service,
        minAttendance: row.min_attendance,
        noDisciplinary: row.no_disciplinary,
        noPip: row.no_pip,
        activeEmployee: row.active_employee,
      };
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        {role.name} Dashboard
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Submit {role.name} evaluations for {period}.{" "}
        {role.scope === "per_team"
          ? "Criteria adapt to each employee's team."
          : "Other roles submit their sections separately."}
      </p>
      <EvaluationForm
        roleKey={role.key}
        roleName={role.name}
        scope={role.scope}
        criteriaFixed={criteriaFixed}
        criteriaByTeam={criteriaByTeam}
        employees={employees}
        existingRatings={existingRatings}
        existingDocuments={existingDocuments}
        canEditEligibility={role.is_admin}
        existingEligibility={existingEligibility}
      />
    </div>
  );
}