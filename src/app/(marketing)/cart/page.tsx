import { Cart } from "@/components/Cart";
export default function Page() {
  return (
    <div className="public-page">
      <div className="page-heading">
        <p className="eyebrow">SHOP GLOBAL</p>
        <h1>Your quote cart</h1>
        <p>
          A saved shopping draft, not a confirmed order. Pricing and
          availability are confirmed by the sourcing team.
        </p>
      </div>
      <Cart />
    </div>
  );
}
