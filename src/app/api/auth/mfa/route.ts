import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { apiSession, fail } from "@/lib/server/http";
import { identity, encrypt, decrypt, hashToken } from "@/lib/server/local-auth";
import { pool } from "@/lib/server/postgres";
import { service } from "@/lib/server/database";
export async function POST(request: Request) {
  try {
    const { user } = await apiSession(request);
    const s = await identity();
    if (!s) throw new Error("Sign in required.");
    const { data: allowed } = await service().rpc("consume_rate_limit", {
      bucket: `mfa:${user.id}`,
      max_hits: 10,
      seconds: 300,
    });
    if (!allowed) throw new Error("Too many MFA attempts. Wait five minutes.");
    const body = await request.json();
    if (body.operation === "enroll") {
      const { rows } = await pool.query(
        "select verified_at from app_auth.mfa_factors where user_id=$1",
        [user.id],
      );
      if (rows[0]?.verified_at)
        return NextResponse.json({
          existing: true,
          message: "Enter the code from your authenticator.",
        });
      const totp = new OTPAuth.TOTP({
        issuer: "Jos Globally",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });
      await pool.query(
        "insert into app_auth.mfa_factors(user_id,encrypted_secret) values($1,$2) on conflict(user_id) do update set encrypted_secret=excluded.encrypted_secret,last_used_step=-1",
        [user.id, encrypt(totp.secret.base32)],
      );
      return NextResponse.json({
        qr: await QRCode.toDataURL(totp.toString()),
        message: "Scan with your authenticator, then enter its six-digit code.",
      });
    }
    if (body.operation === "verify") {
      const c = await pool.connect();
      let recoveryCodes: string[] = [];
      try {
        await c.query("begin");
        const { rows } = await c.query(
          "select * from app_auth.mfa_factors where user_id=$1 for update",
          [user.id],
        );
        const factor = rows[0];
        if (!factor) throw new Error("Set up an authenticator first.");
        const totp = new OTPAuth.TOTP({
          secret: OTPAuth.Secret.fromBase32(decrypt(factor.encrypted_secret)),
          algorithm: "SHA1",
          digits: 6,
          period: 30,
        });
        const delta = totp.validate({ token: String(body.code), window: 1 });
        const step = Math.floor(Date.now() / 30000) + (delta ?? 0);
        if (delta === null || step <= Number(factor.last_used_step))
          throw new Error("Invalid or already used authenticator code.");
        if (!factor.verified_at) {
          recoveryCodes = Array.from({ length: 8 }, () =>
            randomBytes(10).toString("hex"),
          );
          for (const code of recoveryCodes)
            await c.query(
              "insert into app_auth.recovery_codes(user_id,code_hash) values($1,$2)",
              [user.id, hashToken(code)],
            );
        }
        await c.query(
          "update app_auth.mfa_factors set verified_at=coalesce(verified_at,now()),last_used_step=$1 where user_id=$2",
          [step, user.id],
        );
        await c.query(
          "update app_auth.sessions set aal='aal2' where id=$1 and revoked_at is null",
          [s.sessionId],
        );
        await c.query(
          "insert into public.audit_events(actor_id,action,entity,entity_id) values($1,'mfa_verified','profiles',$1)",
          [user.id],
        );
        await c.query("commit");
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
      return NextResponse.json({
        ok: true,
        recoveryCodes,
        message:
          "MFA verified. Save any recovery codes securely before continuing.",
      });
    }
    if (body.operation === "recover") {
      const c = await pool.connect();
      try {
        await c.query("begin");
        const { rows } = await c.query(
          "update app_auth.recovery_codes set used_at=now() where user_id=$1 and code_hash=$2 and used_at is null returning id",
          [user.id, hashToken(String(body.code))],
        );
        if (!rows.length) throw new Error("Invalid or used recovery code.");
        await c.query(
          "update app_auth.sessions set aal='aal2' where id=$1 and revoked_at is null",
          [s.sessionId],
        );
        await c.query(
          "insert into public.audit_events(actor_id,action,entity,entity_id) values($1,'mfa_recovery_used','profiles',$1)",
          [user.id],
        );
        await c.query("commit");
        return NextResponse.json({
          ok: true,
          message: "Recovery code accepted.",
        });
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    }
    throw new Error("Unknown MFA operation.");
  } catch (e) {
    return fail(e);
  }
}
