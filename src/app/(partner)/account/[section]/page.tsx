import { redirect, notFound } from "next/navigation";
import { database } from "@/lib/server/database";
import { requireSession } from "@/lib/server/auth";
import { ActionForm } from "@/components/ActionForm";
import { recognitionAction } from "@/lib/server/commerce-actions";
export default async function Account({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "contributions") redirect("/dashboard/contributions");
  if (section === "support") redirect("/dashboard/support");
  if (section === "documents") redirect("/dashboard/receipts");
  if (section === "notifications") redirect("/dashboard/notifications");
  if (section === "recognition") {
    const s = await requireSession();
    const db = await database();
    const { data: r } = await db
      .from("recognition_preferences")
      .select("*")
      .eq("user_id", s.user.id)
      .maybeSingle();
    return (
      <>
        <div className="page-heading">
          <h1>Recognition is your choice.</h1>
          <p>
            Donations are private by default. Choosing public recognition never
            grants ownership, dividends or financial entitlement. Withdraw
            visibility at any time.
          </p>
        </div>
        <section className="panel" style={{ maxWidth: 650 }}>
          <ActionForm
            action={recognitionAction}
            submit="Save recognition preferences"
          >
            <label>
              Visibility
              <select
                name="visibility"
                defaultValue={r?.visibility ?? "private"}
              >
                <option value="private">
                  Private · visible only to authorised staff
                </option>
                <option value="anonymous">
                  Anonymous · do not identify me publicly
                </option>
                <option value="public">
                  Public · opt in to the Legacy Wall
                </option>
              </select>
            </label>
            <label>
              Public display name
              <input
                name="public_alias"
                maxLength={100}
                defaultValue={r?.public_alias ?? ""}
              />
            </label>
            <label>
              Optional city
              <input name="city" maxLength={100} defaultValue={r?.city ?? ""} />
            </label>
            <label>
              Optional message
              <textarea
                name="message"
                maxLength={500}
                defaultValue={r?.message ?? ""}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={r?.visibility === "public"}
              />
              I explicitly consent to publishing these fields for donations I
              mark public. I can withdraw this visibility later.
            </label>
          </ActionForm>
        </section>
      </>
    );
  }
  notFound();
}
