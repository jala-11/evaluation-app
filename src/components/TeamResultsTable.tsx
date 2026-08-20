"use client";


import { useMemo, useState } from "react";
import { Criterion } from "@/lib/scoring";

export type Employee = {
  id: number;
  emp_id: string;
  name: string;
  email: string;
  team_id: number;
  team_key: string;
  team_name: string;
};

type SortOrder = "none" | "desc" | "asc";

function totalFor(
  criteria: Criterion[],
  ratings: Record<string, number> | undefined,
) {
  return criteria.reduce(
    (sum, c) => sum + (ratings?.[c.key] ? (ratings[c.key] / 5) * c.weight : 0),
    0,
  );
}

export default function TeamResultsTable({
  roleKey,
  criteria,
  employees,
  existingRatings,
  existingDocuments,
}: {
  roleKey: string;
  criteria: Criterion[];
  employees: Employee[];
  existingRatings: Record<number, Record<string, number>>;
  existingDocuments: Record<number, string | undefined>;
}) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const possible = criteria.reduce((sum, c) => sum + c.weight, 0);

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = employees;
    if (query) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.emp_id.toLowerCase().includes(query),
      );
    }
    if (sortOrder !== "none") {
      result = [...result].sort((a, b) => {
        const totalA = totalFor(criteria, existingRatings[a.id]);
        const totalB = totalFor(criteria, existingRatings[b.id]);
        return sortOrder === "desc" ? totalB - totalA : totalA - totalB;
      });
    }
    return result;
  }, [employees, search, sortOrder, criteria, existingRatings]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or Emp ID"
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white w-48"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">
            Sort by total
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="text-sm border border-black/10 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="none">Default</option>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </div>
      </div>

      {criteria.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No criteria are configured yet for this team. Ask HR to set them up
          under Roles.
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 text-left">
              <th className="py-2 pr-4 font-medium">Employee</th>
              <th className="py-2 pr-4 font-medium">Emp ID</th>
              {criteria.map((c) => (
                <th key={c.key} className="py-2 pr-4 font-medium text-right">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pr-4 font-medium">Supporting document</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((emp) => {
              const ratings = existingRatings[emp.id];
              const doc = existingDocuments[emp.id];
              const total = totalFor(criteria, ratings);
              return (
                <tr key={emp.id} className="border-b border-black/5">
                  <td className="py-2 pr-4 text-neutral-900">{emp.name}</td>
                  <td className="py-2 pr-4 text-neutral-500">{emp.emp_id}</td>
                  {criteria.map((c) => (
                    <td
                      key={c.key}
                      className="py-2 pr-4 text-right tabular-nums"
                    >
                      {ratings?.[c.key] ?? "—"}
                    </td>
                  ))}
                  <td className="py-2 pr-4">
                    {doc ? (
                      <a
                        href={`/api/evaluations/document?employeeId=${emp.id}&role=${roleKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {total.toFixed(1)} / {possible}
                  </td>
                </tr>
              );
            })}
            {visibleEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={criteria.length + 4}
                  className="py-6 text-center text-neutral-500"
                >
                  {employees.length === 0
                    ? "No employees on this team."
                    : "No employees match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}