"use client";


import { useMemo, useState } from "react";
import BulkUploadEmployees from "./BulkUploadEmployees";

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

// Natural sort so "WS9" comes before "WS10" instead of after it.
function sortByEmpId(list: Employee[]): Employee[] {
  return [...list].sort((a, b) =>
    a.emp_id.localeCompare(b.emp_id, undefined, { numeric: true, sensitivity: "base" }),
  );
}

export default function EmployeesTable({
  initialEmployees,
  teams,
  canEdit,
}: {
  initialEmployees: Employee[];
  teams: Team[];
  canEdit: boolean;
}) {
  const emptyForm = {
    empId: "",
    name: "",
    email: "",
    teamId: teams[0]?.id ?? 0,
    project: "",
  };

  const [employees, setEmployees] = useState(() => sortByEmpId(initialEmployees));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (teamFilter !== "all" && emp.team_id !== teamFilter) return false;
      if (!query) return true;
      return (
        emp.emp_id.toLowerCase().includes(query) ||
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      );
    });
  }, [employees, search, teamFilter]);

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      empId: emp.emp_id,
      name: emp.name,
      email: emp.email,
      teamId: emp.team_id,
      project: emp.project ?? "",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/employees/${editingId}` : "/api/employees",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (isEditing) {
        setEmployees((prev) =>
          sortByEmpId(
            prev.map((e2) => (e2.id === editingId ? data.employee : e2)),
          ),
        );
      } else {
        setEmployees((prev) => sortByEmpId([...prev, data.employee]));
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Remove this employee? Their evaluation history will also be deleted.",
      )
    )
      return;
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) cancelEdit();
    }
  }

  return (
    <div>
      {canEdit && (
        <BulkUploadEmployees
          teams={teams}
          onImported={(imported) => {
            if (imported.length === 0) return;
            setEmployees((prev) => sortByEmpId([...prev, ...imported]));
          }}
        />
      )}

      {canEdit && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-lg border border-black/10 p-4 grid sm:grid-cols-2 gap-3"
        >
          <div>
            <label className="text-xs font-medium block mb-1">
              Employee ID
            </label>
            <input
              required
              value={form.empId}
              onChange={(e) =>
                setForm((f) => ({ ...f, empId: e.target.value }))
              }
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Team</label>
            <select
              value={form.teamId}
              onChange={(e) =>
                setForm((f) => ({ ...f, teamId: Number(e.target.value) }))
              }
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium block mb-1">
              Assigned Project{" "}
              <span className="text-neutral-500 font-normal">(optional)</span>
            </label>
            <input
              value={form.project}
              onChange={(e) =>
                setForm((f) => ({ ...f, project: e.target.value }))
              }
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          {error && (
            <p className="sm:col-span-2 text-sm text-red-600">{error}</p>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add employee"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Emp ID, name, or email"
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white w-56"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Team</label>
          <select
            value={teamFilter}
            onChange={(e) =>
              setTeamFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-neutral-500 pb-1.5">
          {visibleEmployees.length} of {employees.length} employee
          {employees.length === 1 ? "" : "s"}
        </p>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="py-2 pr-4 font-medium">Emp ID</th>
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Team</th>
            <th className="py-2 pr-4 font-medium">Project</th>
            {canEdit && <th className="py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {visibleEmployees.map((emp) => (
            <tr key={emp.id} className="border-b border-black/5">
              <td className="py-2 pr-4 text-neutral-700">{emp.emp_id}</td>
              <td className="py-2 pr-4 text-neutral-700">{emp.name}</td>
              <td className="py-2 pr-4 text-neutral-700">{emp.email}</td>
              <td className="py-2 pr-4 text-neutral-700">{emp.team_name}</td>
              <td className="py-2 pr-4 text-neutral-700">
                {emp.project || "—"}
              </td>
              {canEdit && (
                <td className="py-2 space-x-3">
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-sm underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="text-sm underline text-red-600"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {visibleEmployees.length === 0 && (
            <tr>
              <td
                colSpan={canEdit ? 6 : 5}
                className="py-6 text-center text-neutral-500"
              >
                {employees.length === 0
                  ? "No employees yet."
                  : "No employees match your search."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}