import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./Brand";
import { SiteHeader } from "./SiteHeader";
export { Brand };
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="topline">
        <span>A movement rooted in Plateau. A vision without borders.</span>
        <Link href="/china-desk">
          Nigeria ↔ China Desk <ArrowUpRight size={13} />
        </Link>
      </div>
      <SiteHeader />
      <main id="main">{children}</main>
      <footer>
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              Connecting our people, businesses, culture
              <br />
              and opportunities to the world.
            </p>
          </div>
          <div>
            <h3>The movement</h3>
            <Link href="/about">About & governance</Link>
            <Link href="/partnership">How partnership works</Link>
            <Link href="/impact">Impact & reports</Link>
            <Link href="/opportunities">Opportunities</Link>
          </div>
          <div>
            <h3>Explore</h3>
            <Link href="/directory">Business directory</Link>
            <Link href="/stories">Stories & news</Link>
            <Link href="/china-desk">China Desk</Link>
            <Link href="/contact">Contact & support</Link>
          </div>
          <div>
            <h3>Trust & transparency</h3>
            <Link href="/terms">Terms of participation</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contribution-policy">Contribution policy</Link>
            <Link href="/refund-policy">Refunds & corrections</Link>
            <Link href="/faq">Frequently asked questions</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            ©{" "}
            <Link href="/control" className="footer-year">
              {new Date().getFullYear()}
            </Link>{" "}
            Jos Globally. From the Plateau, with purpose.
          </span>
          <span>Proposed movement · No implied government endorsement</span>
        </div>
      </footer>
    </>
  );
}
