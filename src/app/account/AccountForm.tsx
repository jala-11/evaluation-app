"use client";


import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountForm({
  name: initialName,
  email: initialEmail,
  roleName,
}: {
  name: string;
  email: string;
  roleName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update account.");
        return;
      }
      setStatus("Account updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Role</label>
        <input
          type="text"
          value={roleName}
          disabled
          className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-neutral-50 text-neutral-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
        />
      </div>

      <div className="pt-2 border-t border-black/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3 mt-4">
          Change password (optional)
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-sm border border-black/10 rounded-md px-3 py-2 bg-white"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-emerald-600">{status}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}