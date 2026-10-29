import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { apiSession, fail } from "@/lib/server/http";
import { costFields } from "@/lib/commerce";
import { label } from "@/lib/domain";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db } = await apiSession();
    const { data: o } = await db
      .from("orders")
      .select("*,quotes(*)")
      .eq("id", id)
      .single();
    if (!o) throw new Error("Order not found.");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const text = (value: string, y: number, size = 11) =>
      page.drawText(value.replace(/[^\x20-\x7E]/g, "?").slice(0, 100), {
        x: 45,
        y,
        size,
        font,
        color: rgb(0.07, 0.24, 0.21),
      });
    text("JOS GLOBALLY - COMMERCIAL ORDER INVOICE", 780, 18);
    text(o.reference, 745, 14);
    text(`Status: ${o.status} | Currency: NGN`, 720);
    text(`Seller: ${o.quotes.seller_of_record}`, 690);
    text(`Importer: ${o.quotes.importer_of_record}`, 670);
    text(`Warranty: ${o.quotes.warranty_party}`, 650);
    costFields.forEach((k, n) =>
      text(
        `${label(k)}: NGN ${(BigInt(o.quotes[k]) / 100n).toString()}.${(BigInt(o.quotes[k]) % 100n).toString().padStart(2, "0")}`,
        610 - n * 24,
      ),
    );
    text(
      `Total: NGN ${(BigInt(o.total_minor) / 100n).toString()}.${(BigInt(o.total_minor) % 100n).toString().padStart(2, "0")}`,
      360,
      14,
    );
    text(`Accepted merchant terms: ${o.accepted_terms_version}`, 325);
    text(
      "This records the commercial order. It is not a donation receipt.",
      290,
    );
    text(
      "Payment is confirmed only after independent bank settlement verification.",
      270,
    );
    return new Response(Buffer.from(await pdf.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${o.reference}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
