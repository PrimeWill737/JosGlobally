import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Handshake,
  Sprout,
  Compass,
  ShieldCheck,
  MoveUpRight,
} from "lucide-react";
import { metrics, published } from "@/lib/server/data";
import { money } from "@/lib/domain";
export const dynamic = "force-dynamic";
const pillars = [
  {
    n: "01",
    icon: Handshake,
    title: "A movement of people",
    text: "A shared purpose. A meaningful way to participate. A stronger Plateau, built together.",
    href: "/movement",
  },
  {
    n: "02",
    icon: Globe2,
    title: "Open doors to global trade",
    text: "Connect local enterprise with international relationships, knowledge and opportunity.",
    href: "/trade",
  },
  {
    n: "03",
    icon: Sprout,
    title: "Opportunity with purpose",
    text: "Discover development projects and programmes grounded in evidence and local impact.",
    href: "/opportunities",
  },
  {
    n: "04",
    icon: Compass,
    title: "A place worth discovering",
    text: "Meet the landscapes, culture, creativity and people that make Plateau extraordinary.",
    href: "/discover",
  },
];
export default async function Home() {
  const [m, stories] = await Promise.all([metrics(), published("articles")]);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> ROOTED IN PLATEAU. REACHING THE WORLD.
          </p>
          <h1>
            From the Jos Plateau
            <br />
            to <em>the World.</em>
          </h1>
          <p className="hero-description">
            A global movement connecting our people,
            <br className="desktop" /> businesses, culture and opportunities.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/shop">
              Shop Global Products <ArrowUpRight size={19} />
            </Link>
            <Link className="text-link" href="/contribute">
              Support the Movement <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-foot">
            <span className="round-icon">
              <Globe2 size={20} />
            </span>
            <p>
              Locally rooted. Globally connected.
              <br />
              <strong>One Plateau. A world of possibilities.</strong>
            </p>
          </div>
        </div>
        <div className="hero-art" aria-label="Illustrated Plateau landscape">
          <div className="art-sun" />
          <div className="contour c1" />
          <div className="contour c2" />
          <div className="contour c3" />
          <div className="mountain far" />
          <div className="mountain middle" />
          <div className="mountain near" />
          <div className="art-grain" />
          <div className="landscape-label">
            <span>09°55′ N &nbsp; 08°54′ E</span>
            <strong>The Plateau perspective.</strong>
            <span>OUR ROOTS. OUR HORIZON.</span>
          </div>
          <span className="art-caption">A LANDSCAPE STUDY OF HOME</span>
          <div className="image-card">
            <span className="dot" />
            <div>
              Born in Plateau.
              <br />
              <strong>Built for connection.</strong>
            </div>
            <MoveUpRight size={24} />
          </div>
        </div>
      </section>
      <div className="mission-strip">
        <span>PEOPLE. PLACE. POSSIBILITY.</span>
        <p>
          Our greatest resource has always been <strong>our people.</strong>
        </p>
        <Link href="/about">
          Get to know us <ArrowUpRight size={17} />
        </Link>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ONE VISION. FOUR PILLARS.</p>
            <h2>
              Local strength.
              <br />
              <em>Global possibility.</em>
            </h2>
          </div>
          <p>
            We’re bringing people, enterprise and ideas together
            <br />
            to create meaningful connections that move Plateau forward.
          </p>
        </div>
        <div className="pillar-grid">
          {pillars.map((p) => (
            <Link href={p.href} className="pillar" key={p.n}>
              <div className="row">
                <p.icon size={29} strokeWidth={1.3} />
                <span>{p.n}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <span className="pillar-link">
                Explore <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="impact-section">
        <div>
          <p className="eyebrow">TRUST IS OUR FOUNDATION</p>
          <h2>
            A shared journey.
            <br />
            <em>Visible progress.</em>
          </h2>
          <p>
            Every confirmed contribution has a trail. Every published milestone
            has evidence. Follow the work as it happens.
          </p>
          <Link href="/impact" className="button ivory">
            See impact & reports <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="metrics-grid">
          <div>
            <span>{money(m?.confirmed_minor ?? 0)}</span>
            <p>Confirmed contributions</p>
          </div>
          <div>
            <span>{m?.partners ?? 0}</span>
            <p>Formal partners</p>
          </div>
          <div>
            <span>{m?.businesses ?? 0}</span>
            <p>Verified enterprises</p>
          </div>
          <div>
            <span>{m?.opportunities ?? 0}</span>
            <p>Published opportunities</p>
          </div>
          <small>
            <ShieldCheck size={16} />
            {m
              ? "Live settled totals. Pending transfers are excluded."
              : "Pre-launch · Verified metrics will appear when operations begin."}
          </small>
        </div>
      </section>
      <section className="section split-section">
        <div className="editorial-art">
          <span>PLATEAU, NIGERIA</span>
          <div className="abstract-hill" />
          <p>
            A place of
            <br />
            <em>perspective.</em>
          </p>
          <small>LANDSCAPE · CULTURE · ENTERPRISE</small>
        </div>
        <div>
          <p className="eyebrow">DISCOVER SOMETHING EXTRAORDINARY</p>
          <h2>
            There’s more
            <br />
            to <em>our story.</em>
          </h2>
          <p>
            Landscapes that stay with you. Traditions that connect generations.
            Entrepreneurs shaping what comes next.
          </p>
          <p>Meet Plateau through the places and people who call it home.</p>
          <Link className="text-link" href="/discover">
            Discover Plateau <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>
      <section className="section stories-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FROM OUR COMMUNITY</p>
            <h2>
              Stories with <em>roots.</em>
            </h2>
          </div>
          <Link className="text-link" href="/stories">
            All stories <ArrowUpRight size={18} />
          </Link>
        </div>
        {stories.length ? (
          <div className="card-grid">
            {stories.slice(0, 3).map((s) => (
              <article className="panel" key={s.id}>
                <span className="eyebrow">PLATEAU VOICES</span>
                <h3>{s.title}</h3>
                <p>{s.summary}</p>
                <Link href={`/stories#${s.id}`}>Read story →</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="editorial-empty">
            <span>THE NEXT CHAPTER STARTS WITH YOU</span>
            <p>Have a Plateau story worth sharing?</p>
            <Link href="/contact">
              Connect with our editorial team <ArrowUpRight size={18} />
            </Link>
          </div>
        )}
      </section>
      <section className="join-banner">
        <p className="eyebrow">YOUR ROOTS. YOUR REACH. YOUR ROLE.</p>
        <h2>
          A world of possibility
          <br />
          starts with <em>us.</em>
        </h2>
        <p>
          Join the movement. Bring your experience, your ideas and your belief
          in Plateau.
        </p>
        <Link className="button" href="/partners/join">
          Find your place in the movement <ArrowUpRight size={18} />
        </Link>
        <small>
          Voluntary contributions start at NGN 1,000 when the programme opens.
        </small>
      </section>
      <div className="sponsor-note">
        <strong>Building the founding ecosystem</strong>
        <p>
          CAGE Holdings is a proposed founding sponsor. CBrilliance, AfrESH,
          Genius WAV, Joscity and JosRide are proposed ecosystem relationships.
          Formal commitments and legal roles remain subject to verification.
        </p>
      </div>
    </>
  );
}
