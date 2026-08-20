export function slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  
  export type CriterionInput = { key: string; label: string; weight: number };
  
  export function normalizeCriteria(input: unknown): CriterionInput[] | null {
    if (!Array.isArray(input)) return null;
    const out: CriterionInput[] = [];
    for (const item of input) {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      const weight = Number(item?.weight);
      if (!label || !Number.isFinite(weight) || weight <= 0) return null;
      out.push({ key: slugify(label) || `criterion_${out.length + 1}`, label, weight });
    }
    return out;
  }
  
  // Shape role_criteria rows (fixed-scope + per-team) into the two forms the
  // evaluator dashboards need: a flat list for fixed-scope roles, and a
  // team_id -> criteria list map for per-team-scope roles.
  export function buildCriteriaMaps(
    criteriaRows: { team_id: number | null; key: string; label: string; weight: number }[],
  ): {
    criteriaFixed: CriterionInput[];
    criteriaByTeam: Record<number, CriterionInput[]>;
  } {
    const criteriaFixed = criteriaRows
      .filter((c) => c.team_id === null)
      .map((c) => ({ key: c.key, label: c.label, weight: c.weight }));
  
    const criteriaByTeam: Record<number, CriterionInput[]> = {};
    for (const c of criteriaRows) {
      if (c.team_id === null) continue;
      if (!criteriaByTeam[c.team_id]) criteriaByTeam[c.team_id] = [];
      criteriaByTeam[c.team_id].push({ key: c.key, label: c.label, weight: c.weight });
    }
  
    return { criteriaFixed, criteriaByTeam };
  }
  
  // Pull out this role's saved ratings/documents per employee from a period's
  // full evaluation list.
  export function buildExistingEvaluations(
    evaluations: {
      role_id: number;
      employee_id: number;
      ratings: Record<string, number>;
      document_name: string | null;
    }[],
    roleId: number,
  ): {
    existingRatings: Record<number, Record<string, number>>;
    existingDocuments: Record<number, string | undefined>;
  } {
    const existingRatings: Record<number, Record<string, number>> = {};
    const existingDocuments: Record<number, string | undefined> = {};
    for (const ev of evaluations) {
      if (ev.role_id === roleId) {
        existingRatings[ev.employee_id] = ev.ratings;
        if (ev.document_name) existingDocuments[ev.employee_id] = ev.document_name;
      }
    }
    return { existingRatings, existingDocuments };
  }