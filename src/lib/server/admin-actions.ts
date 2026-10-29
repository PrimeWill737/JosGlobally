"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireStaff } from "./auth";
import { database } from "./database";
import type { ActionState } from "./actions";
export async function appointPartnerAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireStaff(["super_admin"]);
    const db = await database();
    const { error } = await db.rpc("appoint_partner", {
      target: z.uuid().parse(f.get("user_id")),
      agreement: z.uuid().parse(f.get("agreement_id")),
      new_status: z
        .enum(["active", "flagged", "suspended", "closed"])
        .parse(f.get("status")),
      reason_text: z.string().min(5).max(4000).parse(f.get("reason")),
    });
    if (error) throw error;
    revalidatePath("/admin/partners");
    return {
      ok: true,
      message:
        "Formal partnership decision recorded. No financial payment was used as entitlement.",
    };
  } catch (e) {
    unstable_rethrow(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unable to record appointment.",
    };
  }
}
