"use client";

import { useRef, useState } from "react";
import { readSheet, type SheetData } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";

type Team = { id: number; key: string; name: string };

type Employee = {
  id: number;
  emp_id: string;
  name: string;
  email: string;
  team_id: number;
  team_key: string;
  team_name: string;
  project: string | null;
};

type RowError = { row: number; empId: string; error: string };

const HEADER_ALIASES: Record<string, string[]> = {
  empId: ["employee id", "emp id", "empid", "id"],
  name: ["name", "employee name"],
  email: ["email", "email address"],
  team: ["team", "team name", "assigned team"],
  project: ["assigned project", "project", "project name"],
};

function findColumn(headers: string[], field: keyof typeof HEADER_ALIASES): number {
  const aliases = HEADER_ALIASES[field];
  return headers.findIndex((h) => aliases.includes(h));
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export default function BulkUploadEmployees({
  teams,
  onImported,
}: {
  teams: Team[];
  onImported: (employees: Employee[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<{ created: number; errors: RowError[] } | null>(
    null,
  );
  const [fatalError, setFatalError] = useState<string | null>(null);

  async function handleDownloadTemplate() {
    const exampleTeam = teams[0]?.name ?? "Helpdesk Team";
    await writeXlsxFile([
      ["Employee ID", "Name", "Email", "Team", "Assigned Project"],
      ["WS100", "Jane Cloud", "jane@example.com", exampleTeam, ""],
    ]).toFile("employees_template.xlsx");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setFatalError(null);
    setSummary(null);
    setUploading(true);

    // Step 1: read + parse the spreadsheet in the browser. Kept in its own
    // try/catch so parsing failures (bad file format) get a message that
    // actually matches what went wrong, instead of being lumped in with
    // network/server failures from step 2 below.
    let sheet: SheetData;
    try {
      sheet = await readSheet(file);
    } catch (err) {
      // read-excel-file throws a typed `InvalidInputError` with a specific,
      // human-readable `message` for the common cases (legacy .xls file,
      // not a zip/xlsx at all, empty file, etc.) — surface that directly.
      console.error("Reading the spreadsheet failed:", err);
      const message =
        err instanceof Error && err.message ? err.message : "Could not read that file.";
      setFatalError(`${message} Make sure it's a real .xlsx file (not .xls or .csv renamed).`);
      setUploading(false);
      return;
    }

    if (sheet.length < 2) {
      setFatalError("The file has no data rows.");
      setUploading(false);
      return;
    }

    const headers = sheet[0].map((h) => cellToString(h).toLowerCase());
    const col = {
      empId: findColumn(headers, "empId"),
      name: findColumn(headers, "name"),
      email: findColumn(headers, "email"),
      team: findColumn(headers, "team"),
      project: findColumn(headers, "project"),
    };
    if (col.empId === -1 || col.name === -1 || col.email === -1 || col.team === -1) {
      setFatalError(
        'Could not find "Employee ID", "Name", "Email", and "Team" columns. Use the template for the expected headers.',
      );
      setUploading(false);
      return;
    }

    const clientErrors: RowError[] = [];
    const rows: {
      empId: string;
      name: string;
      email: string;
      teamId: number;
      project: string;
      sourceRow: number;
    }[] = [];

    for (let i = 1; i < sheet.length; i++) {
      const raw = sheet[i];
      const rowNum = i + 1; // 1-based, matches spreadsheet row numbers (header = row 1)
      const empId = cellToString(raw[col.empId]);
      const name = cellToString(raw[col.name]);
      const email = cellToString(raw[col.email]);
      const teamName = cellToString(raw[col.team]);
      const project = col.project === -1 ? "" : cellToString(raw[col.project]);

      if (!empId && !name && !email && !teamName) continue; // skip blank rows

      if (!empId || !name || !email || !teamName) {
        clientErrors.push({
          row: rowNum,
          empId: empId || `(row ${rowNum})`,
          error: "Missing Employee ID, Name, Email, or Team.",
        });
        continue;
      }

      const team = teams.find(
        (t) =>
          t.name.toLowerCase() === teamName.toLowerCase() ||
          t.key.toLowerCase() === teamName.toLowerCase(),
      );
      if (!team) {
        clientErrors.push({
          row: rowNum,
          empId,
          error: `Team "${teamName}" doesn't match any existing team.`,
        });
        continue;
      }

      rows.push({ empId, name, email, teamId: team.id, project, sourceRow: rowNum });
    }

    if (rows.length === 0) {
      setSummary({ created: 0, errors: clientErrors });
      setUploading(false);
      return;
    }

    // Step 2: send the parsed rows to the server. Kept separate from parsing
    // so a network/server hiccup here is never blamed on the file itself.
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const bodyText = await res.text();
      let data: { created?: Employee[]; errors?: RowError[]; error?: string } = {};
      if (bodyText) {
        try {
          data = JSON.parse(bodyText);
        } catch {
          console.error("Non-JSON response from /api/employees/bulk:", res.status, bodyText);
          setFatalError(
            `The server returned an unexpected response (status ${res.status}). Try again, and if it keeps happening, try a smaller file or check the server logs.`,
          );
          return;
        }
      }
      if (!res.ok) {
        setFatalError(data.error ?? `Import failed (status ${res.status}).`);
        return;
      }

      const serverErrors: RowError[] = data.errors ?? [];
      onImported(data.created ?? []);
      setSummary({
        created: (data.created ?? []).length,
        errors: [...clientErrors, ...serverErrors],
      });
    } catch (err) {
      console.error("Uploading to /api/employees/bulk failed:", err);
      setFatalError(
        "Couldn't reach the server to import these rows. Check your connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-black/10 p-4">
      <h2 className="text-sm font-semibold mb-1">Bulk upload</h2>
      <p className="text-xs text-neutral-500 mb-3">
        Upload an .xlsx file with columns: Employee ID, Name, Email, Team,
        Assigned Project (optional).
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
        >
          Download template
        </button>
        <label className="rounded-md bg-accent text-white px-3 py-1.5 text-sm font-medium hover:bg-accent-dark cursor-pointer">
          {uploading ? "Uploading…" : "Upload Excel"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {fatalError && <p className="text-sm text-red-600 mt-3">{fatalError}</p>}

      {summary && (
        <div className="mt-3 text-sm">
          <p className="text-emerald-700 font-medium">
            {summary.created} employee{summary.created === 1 ? "" : "s"} imported.
          </p>
          {summary.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-neutral-600">
                {summary.errors.length} row{summary.errors.length === 1 ? "" : "s"}{" "}
                skipped:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-500 max-h-40 overflow-y-auto">
                {summary.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row} ({e.empId}): {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}