"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { pool } from "./postgres";
import {
  createSession,
  magicLink,
  passwordMatches,
  passwordHash,
  identity,
  signOut,
} from "./local-auth";
import { service } from "@/lib/server/database";
import type { ActionState } from "./actions";
export async function passwordLogin(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const email = z
      .email()
      .parse(String(f.get("email")))
      .toLowerCase();
    const password = z.string().min(1).max(200).parse(f.get("password"));
    const { data: allowed } = await service().rpc("consume_rate_limit", {
      bucket: `password:${email}`,
      max_hits: 8,
      seconds: 900,
    });
    if (!allowed)
      throw new Error("Too many attempts. Try again in 15 minutes.");
    const { rows } = await pool.query(
      "select id,password_hash,email_verified_at,disabled_at from app_auth.users where email=$1",
      [email],
    );
    const user = rows[0];
    const valid = await passwordMatches(
      password,
      user?.password_hash ??
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!user || !valid || !user.email_verified_at || user.disabled_at)
      throw new Error(
        "Email or password is incorrect, or this account is not verified.",
      );
    await createSession(user.id);
    const { rows: admins } = await pool.query(
      "select 1 from role_assignments where user_id=$1 and role='super_admin' and (expires_at is null or expires_at>now())",
      [user.id],
    );
    redirect(admins.length ? "/admin" : "/dashboard");
  } catch (e) {
    unstable_rethrow(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Sign-in failed.",
    };
  }
}
export async function superAdminLogin(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const email = z
      .email()
      .parse(String(f.get("email")))
      .toLowerCase();
    const password = z.string().min(1).max(200).parse(f.get("password"));
    const { data: allowed } = await service().rpc("consume_rate_limit", {
      bucket: `super:${email}`,
      max_hits: 8,
      seconds: 900,
    });
    if (!allowed)
      throw new Error("Too many attempts. Try again in 15 minutes.");
    const { rows } = await pool.query(
      "select id,password_hash,email_verified_at,disabled_at from app_auth.users where email=$1",
      [email],
    );
    const user = rows[0];
    const valid = await passwordMatches(
      password,
      user?.password_hash ??
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    const { rows: admins } = user
      ? await pool.query(
          "select 1 from role_assignments where user_id=$1 and role='super_admin' and (expires_at is null or expires_at>now())",
          [user.id],
        )
      : { rows: [] };
    if (
      !user ||
      !valid ||
      !user.email_verified_at ||
      user.disabled_at ||
      !admins.length
    )
      throw new Error("Email or password is incorrect.");
    await createSession(user.id);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Sign-in failed.",
    };
  }
  redirect("/admin");
}
export async function signupAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const email = z
      .email()
      .parse(String(f.get("email") ?? ""))
      .toLowerCase();
    const password = String(f.get("password") ?? "");
    if (password.length < 12 || password.length > 200)
      throw new Error("Use at least 12 characters.");
    if (password !== String(f.get("confirm") ?? ""))
      throw new Error("Passwords do not match.");
    if (f.get("consent") !== "on")
      throw new Error("Agree to the terms of participation and privacy notice.");
    const { data: allowed } = await service().rpc("consume_rate_limit", {
      bucket: `signup:${email}`,
      max_hits: 8,
      seconds: 900,
    });
    if (!allowed)
      throw new Error("Too many attempts. Try again in 15 minutes.");
    const { rows } = await pool.query(
      "select password_hash,email_verified_at,disabled_at from app_auth.users where email=$1",
      [email],
    );
    const user = rows[0];
    if (user?.disabled_at) throw new Error("Account access is disabled.");
    if (user?.email_verified_at && user.password_hash)
      throw new Error(
        "An account with this email already exists. Sign in instead.",
      );
    await magicLink(email, await passwordHash(password));
    return {
      ok: true,
      message:
        "Check your email to confirm your account. The password you chose is saved when you open the link.",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "The account could not be created.",
    };
  }
}
export async function setPasswordAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const s = await identity();
    if (!s) throw new Error("Sign in required.");
    const password = z.string().min(12).max(200).parse(f.get("password"));
    if (password !== f.get("confirm"))
      throw new Error("Passwords do not match.");
    const { rows } = await pool.query(
      "select password_hash from app_auth.users where id=$1",
      [s.id],
    );
    if (
      rows[0]?.password_hash &&
      !(await passwordMatches(
        String(f.get("current_password") ?? ""),
        rows[0].password_hash,
      ))
    )
      throw new Error("Enter your current password before changing it.");
    await pool.query("update app_auth.users set password_hash=$1 where id=$2", [
      await passwordHash(password),
      s.id,
    ]);
    await pool.query(
      "update app_auth.sessions set revoked_at=now() where user_id=$1 and id<>$2",
      [s.id, s.sessionId],
    );
    return {
      ok: true,
      message: "Password saved. Other sessions were revoked.",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Password update failed.",
    };
  }
}
export async function deleteAccountAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let removed = false;
  try {
    const s = await identity();
    if (!s) throw new Error("Sign in required.");
    if (String(f.get("confirm_delete") ?? "").trim() !== "DELETE")
      throw new Error("Type DELETE to confirm.");
    const { data: allowed } = await service().rpc("consume_rate_limit", {
      bucket: `delete:${s.id}`,
      max_hits: 5,
      seconds: 900,
    });
    if (!allowed)
      throw new Error("Too many attempts. Try again in 15 minutes.");
    const { rows } = await pool.query(
      "select email,password_hash from app_auth.users where id=$1",
      [s.id],
    );
    const user = rows[0];
    if (!user) throw new Error("Account not found.");
    if (user.password_hash) {
      if (
        !(await passwordMatches(String(f.get("password") ?? ""), user.password_hash))
      )
        throw new Error("Password is incorrect.");
    } else if (
      String(f.get("email") ?? "")
        .trim()
        .toLowerCase() !== String(user.email).toLowerCase()
    )
      throw new Error("Enter the email address on this account.");
    await pool.query("select public.hard_delete_account($1)", [s.id]);
    removed = true;
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "The account could not be deleted.",
    };
  }
  if (removed) {
    await signOut(true);
    redirect("/");
  }
  return { ok: false, message: "The account could not be deleted." };
}
