export const publicPages: Record<
  string,
  {
    title: string;
    eyebrow: string;
    intro: string;
    sections: { title: string; body: string }[];
    table?: string;
    cta?: { text: string; href: string };
  }
> = {
  movement: {
    title: "One Plateau. A world of possibility.",
    eyebrow: "The movement",
    intro:
      "A proposed people-powered movement connecting people, capital, enterprises, experiences and international relationships around Plateau State.",
    sections: [
      {
        title: "Our mission",
        body: "Connect our people and enterprises to measurable economic and cultural opportunities. Our success is the opportunity facilitated, not simply the amount contributed.",
      },
      {
        title: "Four ways forward",
        body: "Movement and stakeholders. Global trade. Investment and development information. Destination Plateau. Each pillar creates a practical route to participate.",
      },
      {
        title: "Your contribution, your choice",
        body: "Participation begins with your experience, ideas and relationships. Voluntary contributions begin at NGN 1,000 when the approved programme opens. Contributions do not purchase equity or guarantee financial returns.",
      },
    ],
    cta: { text: "Become a partner", href: "/partners/join" },
  },
  about: {
    title: "Built on purpose. Grounded in trust.",
    eyebrow: "About & governance",
    intro:
      "Jos Globally is a proposed stakeholder movement and long-term destination platform for Plateau State. Formal entity and operating disclosures must be approved before financial launch.",
    sections: [
      {
        title: "The founding ecosystem",
        body: "CAGE Holdings is a proposed founding sponsor. CBrilliance, AfrESH, Genius WAV, Joscity and JosRide are proposed ecosystem participants. This is not evidence of incorporation, ownership or verified commitments.",
      },
      {
        title: "Accountability before scale",
        body: "The owning entity, CAC record where applicable, board, fund custody, authorised signatories, related-party interests and reporting cadence must be publicly disclosed before contributions open.",
      },
      {
        title: "Governance commitments",
        body: "Conflict-of-interest, procurement, vendor selection, expense approval, grievance and whistleblowing policies must have named accountable owners. No government endorsement, charitable status or official representation is implied.",
      },
    ],
    table: "governance_documents",
  },
  partnership: {
    title: "A simple beginning. A transparent journey.",
    eyebrow: "How partnership works",
    intro:
      "Choose individual, business, organisation or institutional participation. Benefits follow approved published eligibility rules, never an implied ownership stake.",
    sections: [
      {
        title: "01 · Create your profile",
        body: "Verify your email and tell us how you want to participate. Add relevant personal or business details.",
      },
      {
        title: "02 · Create a contribution intent",
        body: "Read the effective terms, enter NGN 1,000 or more, and receive a unique reference with a 48-hour expiry. Only approved corporate beneficiary details are shown.",
      },
      {
        title: "03 · Submit transfer evidence",
        body: "Upload your receipt with the transfer reference, amount and date. It remains awaiting review until matched to actual bank settlement.",
      },
      {
        title: "04 · Independent verification",
        body: "A reviewer matches the bank entry and evidence. A different approver confirms settlement. You receive a digital acknowledgement. Giving does not automatically grant formal partnership or stakeholder status.",
      },
      {
        title: "05 · Participate and follow the work",
        body: "Discover programmes, apply under objective rules, offer expertise and follow published impact. Access to programmes follows objective eligibility rules independently of donations. Formal partnership requires a separate approved agreement.",
      },
    ],
    table: "benefit_policies",
    cta: { text: "Start your partnership", href: "/partners/join" },
  },
  trade: {
    title: "Local enterprise. International connections.",
    eyebrow: "Trade gateway",
    intro:
      "Build credible business profiles, explore export readiness and request reviewed buyer or supplier introductions.",
    sections: [
      {
        title: "A directory built on evidence",
        body: "Enterprise profiles include products, capacity, sector, location, certifications, contacts and export readiness. Only reviewed and published profiles enter the public directory.",
      },
      {
        title: "Readiness before reach",
        body: "Prepare applicable NEPC registration, export documentation, invoices, packing lists, certificates of origin and product-specific regulatory evidence. The right requirements depend on your product and destination; the checklist is a preparation tool, not universal legal advice.",
      },
      {
        title: "Introductions with follow-through",
        body: "Buyer enquiries, consent, NDAs, lead ownership, meeting notes and outcomes are recorded. An introduction is not a guarantee of a transaction.",
      },
    ],
    cta: { text: "Make a trade enquiry", href: "/dashboard/trade-enquiries" },
  },
  directory: {
    title: "Meet the enterprises building tomorrow.",
    eyebrow: "Business directory",
    intro:
      "Explore reviewed Plateau businesses. Verification indicates a completed profile review, not a guarantee of performance.",
    sections: [],
    table: "business_profiles",
    cta: { text: "Submit your business", href: "/dashboard/business" },
  },
  opportunities: {
    title: "Opportunity, with a clear view.",
    eyebrow: "Development & programmes",
    intro:
      "An information and enquiry hub for reviewed projects. No securities purchases, pooled investor funds or guaranteed financial returns.",
    sections: [
      {
        title: "Evidence before promotion",
        body: "Projects disclose developer identity, ownership, readiness, estimated budget, material risks, permissions and intended social or economic outcomes. Any commercial negotiation is separately contracted off-platform.",
      },
    ],
    table: "development_projects",
    cta: { text: "Submit a project", href: "/dashboard/projects" },
  },
  programmes: {
    title: "Find your next opportunity to participate.",
    eyebrow: "Programmes",
    intro:
      "Explore published eligibility rules, capacity and deadlines before applying.",
    sections: [],
    table: "programmes",
    cta: { text: "Apply to a programme", href: "/dashboard/applications" },
  },
  discover: {
    title: "A place of perspective.",
    eyebrow: "Discover Plateau",
    intro:
      "Meet Plateau through authenticated landscapes, heritage, arts, agriculture, cuisine, creativity and enterprise.",
    sections: [
      {
        title: "Travel with local knowledge",
        body: "Published destination records include reviewed visitor guidance, operating details and verified contacts. Conditions can change; confirm current arrangements with your operator before travelling.",
      },
      {
        title: "Real stories. Real permission.",
        body: "Community stories and media require editorial provenance, consent and usage rights. We connect visitors with verified operators when ready; we do not invent booking availability.",
      },
    ],
    table: "destinations",
    cta: { text: "Request a local introduction", href: "/dashboard/support" },
  },
  experiences: {
    title: "Experience the Plateau.",
    eyebrow: "Events & experiences",
    intro:
      "Reviewed events and operator contacts, with practical guidance for your visit.",
    sections: [],
    table: "experiences",
  },
  stories: {
    title: "Stories with roots.",
    eyebrow: "Stories & news",
    intro:
      "Meet the people, ideas and enterprises shaping Plateau’s next chapter.",
    sections: [],
    table: "articles",
  },
  "china-desk": {
    title: "A bridge built on relationships.",
    eyebrow: "Nigeria ↔ China",
    intro:
      "A structured enquiry desk for sourcing, appointments, market intelligence, visits and proposed trade missions.",
    sections: [
      {
        title: "Proposed operational anchor",
        body: "A physical China office, city, personnel and legal operating structure have not yet been verified. This page does not claim an established overseas office or licensed commercial service.",
      },
      {
        title: "A clear service scope",
        body: "Submit a request for review and assignment to a coordinator. Services depend on verified capacity, local permissions and a documented scope. No visas, registrations or successful trade outcomes are guaranteed.",
      },
      {
        title: "Responsible cross-border connections",
        body: "Trade, local employment and personal-data sharing require jurisdiction-specific review. Consent and purpose must be documented before introducing counterparties.",
      },
    ],
    table: "trade_missions",
    cta: { text: "Contact the China Desk", href: "/dashboard/china-desk" },
  },
  impact: {
    title: "Progress you can follow.",
    eyebrow: "Impact & reports",
    intro:
      "Public financial totals include confirmed settlement and completed reversals only. Pending receipts never count as confirmed contributions.",
    sections: [
      {
        title: "Our measure of progress",
        body: "We track contributing partners, reconciled funds, verified SMEs, qualified enquiries, facilitated introductions, eligible programme applications and evidenced outcomes. Pilot targets must be agreed with stakeholders.",
      },
      {
        title: "Reports, not promises",
        body: "Published allocations, disbursements, project milestones, governance documents and periodic reports provide the evidence behind the work.",
      },
    ],
    table: "impact_reports",
  },
  contact: {
    title: "Let’s make a meaningful connection.",
    eyebrow: "Contact & support",
    intro:
      "For partnership questions, trade introductions, story submissions, privacy requests or grievances, open a secure support case.",
    sections: [
      {
        title: "Support that can be followed",
        body: "Signed-in support tickets provide a record of your request and its status. The first-response target is two business days, subject to coverage and published holidays.",
      },
      {
        title: "Payment review",
        body: "The review target is one to two business days after sufficient bank evidence is available. Uploading a receipt alone does not verify a transfer.",
      },
    ],
    cta: { text: "Open a support ticket", href: "/dashboard/support" },
  },
  faq: {
    title: "Good questions. Clear answers.",
    eyebrow: "Frequently asked questions",
    intro: "Understand participation before you begin.",
    sections: [
      {
        title: "Does a contribution buy shares?",
        body: "No. Contributions do not confer equity, units, deposits, dividends, ownership or guaranteed monetary benefits.",
      },
      {
        title: "What is the minimum contribution?",
        body: "NGN 1,000, when the approved contribution programme opens. There are no undisclosed platform fees.",
      },
      {
        title: "Is an uploaded receipt enough?",
        body: "No. It must be checked against settled funds in the approved account, reviewed and independently approved.",
      },
      {
        title: "Can I keep my identity private?",
        body: "Yes. Public recognition is optional. Private financial evidence is never displayed in public reports.",
      },
      {
        title: "Is the movement government-backed?",
        body: "No government sponsorship or official endorsement is claimed without evidence and authorisation.",
      },
      {
        title: "How do I install the app?",
        body: "Use the install prompt in a supported browser. On iPhone, use Safari’s Share menu, then Add to Home Screen. Account access and financial actions require connectivity.",
      },
      {
        title: "How do refunds work?",
        body: "Request a refund or correction from your contribution history. Staff review it against the effective policy; a completed refund records a bank reversal and compensating ledger entries.",
      },
    ],
  },
  terms: {
    title: "Terms of participation",
    eyebrow: "Programme terms · Draft for approval",
    intro:
      "These product rules describe the intended programme. Final operator details and professionally approved terms must be published before contributions open.",
    sections: [
      {
        title: "Nature of participation",
        body: "Participation is voluntary. Contributions are not shares, securities, deposits or an investment product and do not imply ownership in CAGE Holdings or any affiliate.",
      },
      {
        title: "Benefits and eligibility",
        body: "Possible non-financial benefits depend on published rules, available capacity and appropriate checks. Contributions do not guarantee admission, introductions or financial gains.",
      },
      {
        title: "Records and disputes",
        body: "Confirmed payments are supported by bank evidence and independent approval. Disputes and corrections are tracked through support. Refunds follow the effective published policy.",
      },
    ],
    table: "partnership_agreements",
  },
  privacy: {
    title: "Your information, handled with care.",
    eyebrow: "Privacy · Draft for approval",
    intro:
      "The operating entity must publish a final privacy notice identifying the controller, contact, lawful bases, retention periods and processors before launch.",
    sections: [
      {
        title: "Purpose and access",
        body: "Account information supports participation, verification and communication. Financial evidence is private and restricted to its owner and authorised finance or audit staff. Public identity recognition is optional.",
      },
      {
        title: "Your choices",
        body: "Use the consent screen to record preferences and the privacy request screen for access, correction, export or erasure requests. Retention of immutable financial evidence requires a documented lawful basis and controlled procedure.",
      },
      {
        title: "Cross-border processing",
        body: "Any Nigeria–China data sharing requires a documented jurisdictional assessment and approved vendor arrangements. No unrestricted international access is implied.",
      },
    ],
    cta: { text: "Manage privacy requests", href: "/dashboard/privacy" },
  },
  "contribution-policy": {
    title: "Clear contributions. Traceable settlement.",
    eyebrow: "Contribution policy · Draft for approval",
    intro:
      "Only funds settled into an approved corporate movement account may be confirmed.",
    sections: [
      {
        title: "Before you transfer",
        body: "Check the beneficiary legal name, bank, account number, NGN currency, reference and expiry. Never transfer to a personal or unapproved account.",
      },
      {
        title: "Evidence and verification",
        body: "Receipts are limited to 5 MB PDF, JPEG or PNG files, scanned before storage and hashed for duplicate detection. Bank matching checks reference, amount, destination and date. Independent approval is required.",
      },
      {
        title: "Your acknowledgement",
        body: "The digital acknowledgement confirms your contribution. It is not a tax-deductible charitable donation receipt.",
      },
    ],
  },
  "refund-policy": {
    title: "A fair path to correction.",
    eyebrow: "Refund & correction policy · Draft for approval",
    intro:
      "Final refund eligibility and timeframes must be approved and published before launch.",
    sections: [
      {
        title: "Raise a request",
        body: "Use your contribution history to request a refund, or submit a support ticket for partial payments, incorrect references, disputed evidence or other discrepancies.",
      },
      {
        title: "Independent review",
        body: "Refunds require an independent finance approver and a bank reversal reference. Confirmed historical records remain intact; balancing reversal entries record completed refunds.",
      },
      {
        title: "Exceptions and disputes",
        body: "Staff document the reason, evidence and decision. No automated promise of refund eligibility or processing time is made before the effective policy is approved.",
      },
    ],
  },
};

publicPages["how-orders-work"] = {
  title: "Global sourcing. Clear steps.",
  eyebrow: "How ordering works",
  intro:
    "A commercial journey independent of voluntary giving. Know your seller, costs and responsibilities before you pay.",
  sections: [
    {
      title: "01 · Choose or request",
      body: "Browse reviewed products or request sourcing. Add products to a quote cart and describe your delivery destination and requirements. Fixed-price labels refer to product pricing; the full landed quotation is confirmed before payment.",
    },
    {
      title: "02 · Review an approved quote",
      body: "Review supplier price, service margin, export handling, freight, insurance, duties and taxes, clearing, domestic delivery and optional inspection. The quote names the seller, importer, warranty provider, sourcing roles, FX source and risk owner, expiry and delivery assumptions.",
    },
    {
      title: "03 · Accept and pay",
      body: "Accept the merchant terms, provide delivery details and generate a unique order payment reference. Transfer only to the verified corporate account and upload scanned evidence. Bank settlement requires independent approval.",
    },
    {
      title: "04 · Follow fulfilment",
      body: "Track procurement approval, purchase, inspection, shipping, customs clearance and domestic delivery. Additional charges require a separately accepted quotation. Open a linked case for returns, disputes, cancellation or failed delivery.",
    },
  ],
  cta: { text: "Explore Shop Global", href: "/shop" },
};
publicPages.contribute = {
  title: "Support a globally connected Plateau.",
  eyebrow: "Voluntary contributions",
  intro:
    "A gift to declared movement activities. A meaningful acknowledgement. No implied ownership, financial return, product entitlement or automatic business partnership.",
  sections: [
    {
      title: "Choose your purpose",
      body: "Support general movement activities or a published restricted project. Restricted funds are tracked separately; cancelled projects require a documented donor resolution before reassignment.",
    },
    {
      title: "Choose your recognition",
      body: "Private is the default. You may remain anonymous or explicitly opt in to the Legacy Wall with a chosen display name, city and message. Recognition is never a financial tier or a measure of human worth.",
    },
    {
      title: "Follow the evidence",
      body: "Verified donations, reversals, allocations and reconciled project spending are reported separately from commerce. Your personal giving history is a record of gifts, not a redeemable account balance.",
    },
  ],
  cta: { text: "Make a voluntary contribution", href: "/checkout/donate" },
};
publicPages.projects = publicPages.opportunities;
publicPages.help = publicPages.faq;
publicPages.partners = {
  title: "Partnership is built through agreement.",
  eyebrow: "Partners & stakeholders",
  intro:
    "Customers purchase products. Movement Supporters give voluntarily. Strategic partners and appointed stakeholders have separately approved agreements and responsibilities.",
  sections: [
    {
      title: "No automatic title from a payment",
      body: "Neither an order nor a contribution automatically confers formal partner, stakeholder or shareholder status. Programme participation follows objective eligibility rules.",
    },
    {
      title: "Proposed founding relationships",
      body: "CAGE Holdings, CBrilliance, AfrESH, Genius WAV, Joscity and JosRide are stated ecosystem intentions. Corporate identities, sourcing authority, contractual roles and on-ground operations must be independently verified.",
    },
  ],
  cta: {
    text: "Discuss a formal partnership",
    href: "/dashboard/organisations",
  },
};
