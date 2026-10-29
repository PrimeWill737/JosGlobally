"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ActionForm } from "./ActionForm";
import { quoteRequestAction } from "@/lib/server/commerce-actions";
type Item = { product_id: string; title: string; quantity: number };
const key = "jos-quote-cart-v1";
function read(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
export function AddToCart({ id, title }: { id: string; title: string }) {
  const [added, setAdded] = useState(false);
  return (
    <>
      <button
        className="button"
        onClick={() => {
          const items = read();
          const found = items.find((i) => i.product_id === id);
          if (found) found.quantity = Math.min(10000, found.quantity + 1);
          else items.push({ product_id: id, title, quantity: 1 });
          localStorage.setItem(key, JSON.stringify(items));
          setAdded(true);
        }}
      >
        Add to quote cart <ArrowUpRight size={16} aria-hidden="true" />
      </button>
      {added && (
        <p role="status" className="notice">
          Added.{" "}
          <Link href="/cart">
            Review your quote cart <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </p>
      )}
    </>
  );
}
export function Cart() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => setItems(read()), []);
  function update(next: Item[]) {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  return (
    <>
      {items.length ? (
        <>
          <div className="panel">
            {items.map((i) => (
              <div
                className="row"
                key={i.product_id}
                style={{ padding: 15, borderBottom: "1px solid #dce0d3" }}
              >
                <strong>{i.title}</strong>
                <label>
                  Quantity{" "}
                  <input
                    aria-label={`Quantity for ${i.title}`}
                    type="number"
                    min={1}
                    max={10000}
                    value={i.quantity}
                    onChange={(e) =>
                      update(
                        items.map((x) =>
                          x.product_id === i.product_id
                            ? {
                                ...x,
                                quantity: Math.max(
                                  1,
                                  Math.min(10000, Number(e.target.value) || 1),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="text-link"
                  onClick={() =>
                    update(items.filter((x) => x.product_id !== i.product_id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <ActionForm
            action={quoteRequestAction}
            submit="Request itemized quotation"
          >
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(
                items.map(({ product_id, quantity }) => ({
                  product_id,
                  quantity,
                })),
              )}
            />
            <label>
              Delivery destination and requirements
              <textarea
                name="details"
                required
                minLength={5}
                placeholder="Tell us the destination, specifications, quantity needs and preferred timing."
              />
            </label>
            <p>
              Prices and availability are verified through a quotation. No
              payment is taken here. Sign in to submit your request.
            </p>
          </ActionForm>
        </>
      ) : (
        <div className="empty">
          <h3>Your quote cart is empty.</h3>
          <p>Choose products to request a transparent landed-cost quotation.</p>
          <Link className="text-link" href="/shop">
            Explore Shop Global <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}
