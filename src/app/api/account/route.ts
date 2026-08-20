import { NextRequest, NextResponse } from "next/server";
import {
  createSessionCookie,
  getSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { findUserByEmail, updateUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  }
  if (newPassword && newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const current = await findUserByEmail(session.email);
  if (!current) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Enter your current password to set a new one." },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(currentPassword, current.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 },
      );
    }
  }

  if (email.toLowerCase() !== current.email.toLowerCase()) {
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== current.id) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 },
      );
    }
  }

  const passwordHash = newPassword ? await hashPassword(newPassword) : undefined;
  const updated = await updateUser(current.id, {
    email,
    name,
    roleId: current.role_id,
    passwordHash,
  });
  if (!updated) {
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }

  // Re-issue the session cookie so the sidebar and every server-rendered
  // page reflect the new name/email right away, without requiring the user
  // to sign in again.
  await createSessionCookie({
    userId: updated.id,
    email: updated.email,
    name: updated.name,
    roleId: updated.role_id,
    roleKey: updated.role_key,
    roleName: updated.role_name,
    isAdmin: updated.is_admin,
  });

  return NextResponse.json({ user: updated });
}