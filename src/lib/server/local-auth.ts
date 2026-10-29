import "server-only";
import { cookies } from "next/headers";
import {
  randomBytes,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { promisify } from "node:util";
import { appUrl } from "./app-url";
import { sendAuthEmail } from "./email";
import { pool, type Identity } from "./postgres";
const scrypt = promisify(scryptCb);
const cookieName = "jg_session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function identity(): Promise<Identity | null> {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const { rows } = await pool.query(
    "select s.id as session_id,s.user_id,u.email,s.aal from app_auth.sessions s join app_auth.users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and s.revoked_at is null and u.disabled_at is null and u.email_verified_at is not null",
    [hashToken(token)],
  );
  const r = rows[0];
  return r
    ? { id: r.user_id, email: r.email, aal: r.aal, sessionId: r.session_id }
    : null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "insert into app_auth.sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '12 hours')",
    [userId, hashToken(token)],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
export async function signOut(all = false) {
  const s = await identity();
  if (s)
    await pool.query(
      `update app_auth.sessions set revoked_at=now() where ${all ? "user_id" : "id"}=$1`,
      [all ? s.id : s.sessionId],
    );
  (await cookies()).delete(cookieName);
}
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return (
    expected.length === derived.length && timingSafeEqual(derived, expected)
  );
}
export function encrypt(value: string) {
  if (!process.env.AUTH_SECRET)
    throw new Error("Authentication encryption is not configured.");
  const key = createHash("sha256").update(process.env.AUTH_SECRET).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}
export function decrypt(value: string) {
  if (!process.env.AUTH_SECRET)
    throw new Error("Authentication encryption is not configured.");
  const [iv, tag, data] = value.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    createHash("sha256").update(process.env.AUTH_SECRET).digest(),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
export async function magicLink(email: string, pendingPasswordHash?: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    throw new Error(
      "Email sign-in is awaiting Resend configuration. Existing accounts can use password sign-in.",
    );
  const token = randomBytes(32).toString("base64url");
  const normalized = email.toLowerCase();
  await pool.query("delete from app_auth.login_tokens where email=$1", [
    normalized,
  ]);
  await pool.query(
    "insert into app_auth.login_tokens(email,token_hash,expires_at,password_hash) values($1,$2,now()+interval '15 minutes',$3)",
    [normalized, hashToken(token), pendingPasswordHash ?? null],
  );
  try {
    await sendAuthEmail(
      normalized,
      `${appUrl()}/auth/callback?token=${token}`,
      pendingPasswordHash ? "signup" : "signin",
    );
  } catch (e) {
    await pool.query("delete from app_auth.login_tokens where token_hash=$1", [
      hashToken(token),
    ]);
    throw e;
  }
}
export async function redeemMagicLink(token: string) {
  if (!/^[\w-]{40,60}$/.test(token)) throw new Error("Invalid sign-in link.");
  const c = await pool.connect();
  let id: string;
  try {
    await c.query("begin");
    const { rows } = await c.query(
      "delete from app_auth.login_tokens where token_hash=$1 and expires_at>now() returning email,password_hash",
      [hashToken(token)],
    );
    if (!rows.length)
      throw new Error("This link has expired or has already been used.");
    const { rows: users } = await c.query(
      "insert into app_auth.users(email,password_hash,email_verified_at,raw_user_meta_data) values($1,$2,now(),'{}') on conflict(email) do update set email_verified_at=coalesce(app_auth.users.email_verified_at,now()), password_hash=coalesce(app_auth.users.password_hash, excluded.password_hash) returning id,disabled_at",
      [rows[0].email, rows[0].password_hash],
    );
    if (users[0].disabled_at) throw new Error("Account access is disabled.");
    id = users[0].id;
    if (rows[0].password_hash)
      await c.query(
        "insert into consent_records(owner_id,title,status,data) values($1,'Account terms and privacy notice','submitted',jsonb_build_object('policy','account-terms-privacy-v1','accepted_at',now()))",
        [id],
      );
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
  await createSession(id);
}
