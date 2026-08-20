import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createEmployee, getTeam, type Employee } from "@/lib/data";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "You don't have permission to add employees." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows in one upload (max ${MAX_ROWS}).` },
      { status: 400 },
    );
  }

  // Cache team lookups since the same team repeats across many rows.
  const teamCache = new Map<number, boolean>();
  async function teamExists(teamId: number): Promise<boolean> {
    if (teamCache.has(teamId)) return teamCache.get(teamId)!;
    const team = await getTeam(teamId);
    teamCache.set(teamId, Boolean(team));
    return Boolean(team);
  }

  const created: Employee[] = [];
  const errors: { row: number; empId: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = Number.isFinite(Number(raw?.sourceRow)) ? Number(raw.sourceRow) : i + 1;
    const empId = typeof raw?.empId === "string" ? raw.empId.trim() : "";
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    const email = typeof raw?.email === "string" ? raw.email.trim() : "";
    const teamId = Number(raw?.teamId);
    const project = typeof raw?.project === "string" ? raw.project.trim() || null : null;

    if (!empId || !name || !email || !Number.isFinite(teamId)) {
      errors.push({
        row: rowNum,
        empId: empId || `(row ${rowNum})`,
        error: "Missing Employee ID, Name, Email, or Team.",
      });
      continue;
    }
    if (!(await teamExists(teamId))) {
      errors.push({ row: rowNum, empId, error: "Team does not exist." });
      continue;
    }

    try {
      const employee = await createEmployee({ empId, name, email, teamId, project });
      created.push(employee);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create employee";
      const isDuplicate = message.includes("duplicate key");
      errors.push({
        row: rowNum,
        empId,
        error: isDuplicate ? "Employee ID or email already exists." : message,
      });
    }
  }

  return NextResponse.json({ created, errors });
}