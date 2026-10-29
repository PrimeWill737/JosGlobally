import { PublicShell } from "@/components/PublicShell";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
export default function Join() {
  return (
    <PublicShell>
      <div className="public-page">
        <div className="page-heading">
          <p className="eyebrow">BECOME A PARTNER</p>
          <h1>
            There’s a place
            <br />
            for <em>you here.</em>
          </h1>
          <p>
            Join as an individual, business, organisation or institution. Bring
            your skills, relationships and belief in Plateau.
          </p>
        </div>
        <div className="card-grid">
          {[
            [
              "Individual",
              "Residents, diaspora members, mentors and people who want to participate.",
            ],
            [
              "Business",
              "Enterprises seeking visibility, readiness support and international connections.",
            ],
            [
              "Organisation or institution",
              "Groups and institutions building accountable, long-term partnerships.",
            ],
          ].map(([title, body]) => (
            <article className="panel" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
              <Link href="/login" className="text-link">
                Create your profile <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <div className="notice">
          Voluntary contributions begin at NGN 1,000 when the approved programme
          opens. They do not confer equity, ownership or guaranteed financial
          returns.{" "}
          <Link href="/partnership">
            Read how partnership works <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
