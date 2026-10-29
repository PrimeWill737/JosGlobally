import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { apiSession, fail } from "@/lib/server/http";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    z.uuid().parse(id);
    const { db } = await apiSession();
    const { data: c } = await db
      .from("contributions")
      .select("*")
      .eq("id", id)
      .single();
    if (!c) throw new Error("Acknowledgement not found or access denied.");
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({
      x: 0,
      y: 685,
      width: 595,
      height: 157,
      color: rgb(0.07, 0.24, 0.21),
    });
    page.drawText("JOS GLOBALLY", {
      x: 45,
      y: 770,
      size: 26,
      font: bold,
      color: rgb(0.96, 0.95, 0.91),
    });
    page.drawText(
      c.purpose === "order"
        ? "COMMERCIAL PAYMENT ACKNOWLEDGEMENT"
        : "VOLUNTARY CONTRIBUTION ACKNOWLEDGEMENT",
      { x: 45, y: 730, size: 12, font, color: rgb(0.8, 0.69, 0.43) },
    );
    const lines = [
      c.acknowledgement_id,
      `Amount confirmed: NGN ${(BigInt(c.amount_minor) / 100n).toString()}.${(BigInt(c.amount_minor) % 100n).toString().padStart(2, "0")}`,
      `Confirmed: ${new Date(c.created_at).toISOString()}`,
      `Contribution: ${c.id}`,
      `Participant: ${c.owner_id}`,
      "",
      "Settlement was matched and independently approved.",
      "This acknowledgement is not a tax-deductible donation receipt.",
      c.purpose === "order"
        ? "This payment relates to a commercial order and its accepted merchant terms."
        : "A gift does not confer shares, partnership, ownership or guaranteed returns.",
      "Any later refund is recorded separately in your contribution history.",
    ];
    lines.forEach((line, n) =>
      page.drawText(line, {
        x: 45,
        y: 635 - n * 28,
        size: 10,
        font,
        color: rgb(0.09, 0.15, 0.13),
      }),
    );
    return new Response(Buffer.from(await doc.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${c.acknowledgement_id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
