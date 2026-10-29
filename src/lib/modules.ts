import type { Role } from "./domain";
export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "email" | "select";
  options?: string[];
  required?: boolean;
};
export type Module = {
  table: string;
  title: string;
  description: string;
  role: Role;
  public?: boolean;
  fields: Field[];
};
const f = (
  name: string,
  label: string,
  type: Field["type"] = "text",
  required = false,
): Field => ({ name, label, type, required });
export const modules: Record<string, Module> = {
  applications: {
    table: "applications",
    title: "Programme applications",
    description:
      "Apply against published eligibility rules and follow your review.",
    role: "programme_manager",
    fields: [
      f("programme_id", "Programme ID", "text", true),
      f(
        "eligibility",
        "How you meet the eligibility criteria",
        "textarea",
        true,
      ),
    ],
  },
  business: {
    table: "business_profiles",
    title: "My business",
    description:
      "Present your enterprise to the world. Profiles appear publicly only after review.",
    role: "trade_manager",
    public: true,
    fields: [
      f("sector", "Sector", "text", true),
      f("location", "Location", "text", true),
      f("products", "Products and services", "textarea", true),
      f("capacity", "Production capacity"),
      f("certifications", "Certifications"),
      f("export_readiness", "Export readiness"),
      f("contact", "Public business contact"),
      f("provenance", "Evidence and media permissions", "textarea"),
    ],
  },
  products: {
    table: "product_catalogue",
    title: "Product catalogue",
    description:
      "Products, capacity and specifications from reviewed enterprises.",
    role: "trade_manager",
    public: true,
    fields: [
      f("business_id", "Business ID"),
      f("specifications", "Specifications", "textarea"),
      f("capacity", "Supply capacity"),
    ],
  },
  "trade-enquiries": {
    table: "buyer_enquiries",
    title: "Trade enquiries",
    description:
      "Request sourcing, suppliers or introductions. Each request is reviewed.",
    role: "trade_manager",
    fields: [
      f("market", "Target market", "text", true),
      f("quantity", "Quantity / scope"),
      f("requirements", "Requirements", "textarea", true),
      f("consent", "Consent to share with a matched business", "text", true),
    ],
  },
  "china-desk": {
    table: "china_requests",
    title: "China Desk requests",
    description:
      "Request an appointment, sourcing support, a visit or a trade briefing.",
    role: "trade_manager",
    fields: [
      {
        name: "request_type",
        label: "Request type",
        type: "select",
        options: [
          "Appointment",
          "Sourcing",
          "Visit",
          "Trade mission",
          "Market intelligence",
        ],
      },
      f("preferred_date", "Preferred date", "date"),
      f("requirements", "What would you like help with?", "textarea", true),
    ],
  },
  introductions: {
    table: "introductions",
    title: "Matchmaking",
    description:
      "Record consent, lead ownership and outcomes for each introduction.",
    role: "trade_manager",
    fields: [
      f("enquiry_id", "Enquiry ID"),
      f("business_id", "Business ID"),
      f("consent", "NDA and sharing consent", "textarea", true),
      f("outcome", "Outcome", "textarea"),
      f("lead_owner", "Lead owner"),
    ],
  },
  meetings: {
    table: "meeting_logs",
    title: "Meeting log",
    description: "Document agreed next steps and commercial outcomes.",
    role: "trade_manager",
    fields: [
      f("meeting_date", "Meeting date", "date"),
      f("participants", "Participants"),
      f("next_steps", "Next steps", "textarea"),
    ],
  },
  missions: {
    table: "trade_missions",
    title: "Trade missions",
    description:
      "Approved missions and briefing dates. Participation is subject to review.",
    role: "trade_manager",
    public: true,
    fields: [
      f("date", "Date", "date"),
      f("location", "Location"),
      f("coordinator", "Verified coordinator"),
      f("scope", "Scope and eligibility", "textarea"),
    ],
  },
  projects: {
    table: "development_projects",
    title: "Development projects",
    description:
      "Information and enquiries only. No securities, pooled funds or promised returns.",
    role: "programme_manager",
    public: true,
    fields: [
      f("sector", "Sector", "text", true),
      f("developer", "Developer identity", "text", true),
      f("ownership", "Ownership / title evidence", "textarea", true),
      f("readiness", "Readiness stage"),
      f("budget", "Estimated project budget (NGN)"),
      f("risks", "Material risks", "textarea", true),
      f(
        "permissions",
        "Permissions and fundraising structure",
        "textarea",
        true,
      ),
      f("outcomes", "Expected social / economic outcomes", "textarea"),
    ],
  },
  "investor-enquiries": {
    table: "investor_enquiries",
    title: "Project enquiries",
    description:
      "Ask for project information and due diligence. Agreements take place separately.",
    role: "programme_manager",
    fields: [
      f("project_id", "Project ID", "text", true),
      f("questions", "Questions", "textarea", true),
    ],
  },
  diligence: {
    table: "diligence_reviews",
    title: "Due diligence",
    description:
      "Review project identity, documentation, permissions and risks before publication.",
    role: "programme_manager",
    fields: [
      f("project_id", "Project ID", "text", true),
      f("findings", "Findings", "textarea", true),
      f("conflicts", "Conflict disclosures", "textarea"),
    ],
  },
  programmes: {
    table: "programmes",
    title: "Programmes",
    description:
      "Publish objective eligibility, capacity and application deadlines.",
    role: "programme_manager",
    public: true,
    fields: [
      f("eligibility", "Eligibility rules", "textarea", true),
      f("capacity", "Capacity", "number"),
      f("deadline", "Application deadline", "date"),
      f("benefits", "Non-financial benefits", "textarea"),
    ],
  },
  eligibility: {
    table: "eligibility_reviews",
    title: "Eligibility reviews",
    description: "Document fair decisions against published programme rules.",
    role: "programme_manager",
    fields: [
      f("application_id", "Application ID", "text", true),
      f("findings", "Assessment and rationale", "textarea", true),
    ],
  },
  allocations: {
    table: "allocations",
    title: "Allocations & disbursements",
    description:
      "Record approved programme allocations with evidence and conflict disclosures.",
    role: "finance_approver",
    public: true,
    fields: [
      f("programme_id", "Programme ID", "text", true),
      f("amount", "Amount (NGN)", "text", true),
      f("bank_reference", "Disbursement reference"),
      f("conflicts", "Conflict disclosure", "textarea"),
      f("evidence", "Approval evidence", "textarea", true),
    ],
  },
  reports: {
    table: "impact_reports",
    title: "Impact reports",
    description:
      "Publish verified outcomes, financial reports and correction notes.",
    role: "publisher",
    public: true,
    fields: [
      f("period", "Reporting period"),
      f("outcomes", "Verified outcomes", "textarea", true),
      f("document_url", "Published report URL"),
      f("corrections", "Correction log", "textarea"),
    ],
  },
  stories: {
    table: "articles",
    title: "Stories & news",
    description:
      "Editorial stories with author review, provenance and scheduled publishing.",
    role: "publisher",
    public: true,
    fields: [
      f("body", "Story", "textarea", true),
      f("author", "Author", "text", true),
      f("provenance", "Sources, consent and image credits", "textarea", true),
      f("locale", "Language"),
      f("corrections", "Correction log", "textarea"),
    ],
  },
  destinations: {
    table: "destinations",
    title: "Destinations",
    description: "Verified places, heritage and practical visitor information.",
    role: "publisher",
    public: true,
    fields: [
      f("category", "Category"),
      f("location", "Location / map coordinates"),
      f("guidance", "Safe visiting guidance", "textarea", true),
      f("contact", "Verified operator contact"),
      f("hours", "Operating hours"),
      f("provenance", "Editorial sources and media licence", "textarea", true),
    ],
  },
  experiences: {
    table: "experiences",
    title: "Experiences & events",
    description:
      "Connect visitors with verified operators. No invented booking inventory.",
    role: "publisher",
    public: true,
    fields: [
      f("category", "Category"),
      f("date", "Event date", "date"),
      f("operator", "Verified operator"),
      f("contact", "Contact"),
      f("guidance", "Visitor guidance", "textarea"),
      f("provenance", "Sources and permissions", "textarea", true),
    ],
  },
  diaspora: {
    table: "diaspora_profiles",
    title: "Diaspora connections",
    description:
      "Offer mentorship, expertise, introductions or chapter coordination.",
    role: "trade_manager",
    fields: [
      f("country", "Country", "text", true),
      f("expertise", "Expertise", "textarea", true),
      f("participation", "How you want to participate"),
      f("consent", "Contact-sharing consent", "text", true),
    ],
  },
  support: {
    table: "support_tickets",
    title: "Support tickets",
    description:
      "Ask a question, report a dispute or request a correction. First response target: two business days.",
    role: "programme_manager",
    fields: [
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          "General",
          "Payment dispute",
          "Correction",
          "Grievance",
          "Whistleblowing",
        ],
      },
      f("details", "Details", "textarea", true),
    ],
  },
  consent: {
    table: "consent_records",
    title: "Consent & preferences",
    description: "Manage communication choices and document consent decisions.",
    role: "auditor",
    fields: [
      {
        name: "policy",
        label: "Policy",
        type: "select",
        options: [
          "Email updates",
          "Public recognition",
          "Trade introductions",
          "Withdraw marketing consent",
        ],
      },
      f("decision", "Your decision", "textarea", true),
    ],
  },
  privacy: {
    table: "privacy_requests",
    title: "Privacy requests",
    description:
      "Request access, correction, export or erasure. Financial retention obligations may apply.",
    role: "auditor",
    fields: [
      {
        name: "kind",
        label: "Request type",
        type: "select",
        options: ["Access", "Export", "Correction", "Erasure"],
      },
      f("details", "Details", "textarea", true),
    ],
  },
  readiness: {
    table: "export_checklists",
    title: "Export readiness",
    description:
      "Record applicable registration and document readiness. Requirements vary by product and destination.",
    role: "trade_manager",
    fields: [
      f("product", "Product category", "text", true),
      f("nepc", "NEPC exporter registration"),
      f("nxp", "NXP / export documentation"),
      f("origin", "Certificate of origin"),
      f("invoice", "Invoice and packing list"),
      f("regulatory", "Applicable SON / NAFDAC / quarantine evidence"),
      f("shipping", "Shipping, customs and Incoterms support"),
    ],
  },
  governance: {
    table: "governance_documents",
    title: "Governance",
    description:
      "Publish entity records, board disclosures, custody, policies and reporting cadence.",
    role: "publisher",
    public: true,
    fields: [
      f("body", "Policy / disclosure", "textarea", true),
      f("effective_date", "Effective date", "date"),
      f("approval", "Approval record", "text", true),
      f("document_url", "Evidence URL"),
    ],
  },
  campaigns: {
    table: "campaigns",
    title: "Campaigns",
    description: "Approved movement campaigns with accountable objectives.",
    role: "programme_manager",
    public: true,
    fields: [
      f("objectives", "Objectives", "textarea"),
      f("deadline", "Closing date", "date"),
    ],
  },
  risks: {
    table: "risk_register",
    title: "Risk register",
    description:
      "Assign owners and track the controls in section 20 of the roadmap.",
    role: "super_admin",
    fields: [
      f("risk_owner", "Accountable owner", "text", true),
      f("mitigation", "Mitigation", "textarea", true),
      f("due", "Review date", "date"),
    ],
  },
  launch: {
    table: "launch_checklist",
    title: "Launch readiness",
    description:
      "Record evidence and sign-off for legal, operational and engineering launch gates.",
    role: "super_admin",
    fields: [
      f("owner", "Owner", "text", true),
      f("evidence", "Evidence and sign-off", "textarea", true),
      f("due", "Due date", "date"),
    ],
  },
  policies: {
    table: "benefit_policies",
    title: "Benefit policies",
    description:
      "Only approved non-financial participation benefits; no implicit ownership or returns.",
    role: "publisher",
    public: true,
    fields: [
      f("body", "Policy text", "textarea", true),
      f("effective_date", "Effective date", "date"),
      f("approval", "Approval record", "text", true),
    ],
  },
  agreements: {
    table: "partnership_agreements",
    title: "Partnership agreements",
    description:
      "Versioned programme terms approved before contributions open.",
    role: "publisher",
    public: true,
    fields: [
      f("body", "Agreement text", "textarea", true),
      f("effective_date", "Effective date", "date"),
      f("approval", "Approval record", "text", true),
    ],
  },
  organisations: {
    table: "organisations",
    title: "Organisations",
    description: "Register an organisation for identity and business review.",
    role: "super_admin",
    fields: [
      f("registration", "Registration number"),
      f("legal_name", "Legal name", "text", true),
      f("disclosures", "Ownership and conflict disclosures", "textarea", true),
    ],
  },
  identity: {
    table: "identity_verifications",
    title: "Identity reviews",
    description:
      "Document proportionate identity checks and verification evidence.",
    role: "auditor",
    fields: [
      f("subject_id", "Profile or organisation ID", "text", true),
      f("findings", "Verification findings", "textarea", true),
    ],
  },
  pages: {
    table: "pages",
    title: "Website pages",
    description: "Maintain reviewed public copy and structured SEO metadata.",
    role: "publisher",
    public: true,
    fields: [
      f("slug", "Page slug", "text", true),
      f("body", "Body", "textarea", true),
      f("seo_description", "SEO description"),
    ],
  },
  translations: {
    table: "translations",
    title: "Translations",
    description: "Prepare reviewed multilingual content.",
    role: "publisher",
    public: true,
    fields: [
      f("source_id", "Source record ID"),
      f("locale", "Language code", "text", true),
      f("body", "Translated text", "textarea", true),
    ],
  },
};
export const partnerModules = [
  "applications",
  "business",
  "products",
  "trade-enquiries",
  "china-desk",
  "projects",
  "investor-enquiries",
  "diaspora",
  "readiness",
  "organisations",
  "support",
  "consent",
  "privacy",
];
export const contentModules = [
  "stories",
  "destinations",
  "experiences",
  "reports",
  "governance",
  "pages",
  "translations",
];
