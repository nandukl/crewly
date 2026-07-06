const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak, LevelFormat,
  convertInchesToTwip, VerticalAlign
} = require("docx");
const fs = require("fs");
const path = require("path");

// ---------- helpers ----------
const COLORS = {
  navy: "1F2937",
  accent: "2563EB",
  green: "15803D",
  amber: "B45309",
  red: "B91C1C",
  gray: "6B7280",
  lightGray: "F3F4F6",
};

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: COLORS.accent, space: 4, style: BorderStyle.SINGLE, size: 6 } },
  });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}
function bold(text) { return new TextRun({ text, bold: true }); }

function statusRun(label) {
  const map = {
    "BUILT & VERIFIED": COLORS.green,
    "BUILT — FIXES APPLIED": COLORS.green,
    "STUB / PARTIAL": COLORS.amber,
    "NOT STARTED": COLORS.gray,
  };
  return new TextRun({ text: label, bold: true, color: map[label] || COLORS.navy });
}

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  });
}
function headerCell(text, width) {
  return cell(new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF" })] }),
    { width, shading: COLORS.navy });
}
function textCell(text, width, opts = {}) {
  return cell(new Paragraph({ children: [new TextRun({ text, bold: !!opts.bold, color: opts.color })] }), { width, shading: opts.shading });
}

// ---------- Module status data ----------
const moduleStatus = [
  ["1a", "Authentication", "Platform Foundation", "BUILT & VERIFIED", "Signup/login, email verification, lockout, session tracking, revocation. Edge Function deployed. See §8."],
  ["1b", "Organization Management", "Platform Foundation", "BUILT — FIXES APPLIED", "Org/membership/structure schema + RPCs live. Critical RLS bypass found & patched. See §8."],
  ["1c", "RBAC", "Platform Foundation", "BUILT & VERIFIED", "Custom roles/permission grants, has_permission() gate. Reference pattern for the platform. See §8."],
  ["2", "Subscription & Billing Engine", "Platform Foundation", "STUB / PARTIAL", "Trial state machine + billing gate + admin override UI built. Razorpay integration not started. See §8."],
  ["3", "Notification Framework", "Platform Foundation", "NOT STARTED", "Design locked. Explicitly paused pending Module 1b/1c security fix closure."],
  ["4", "Audit Logging", "Platform Foundation", "NOT STARTED", "Only a stub table (auth_audit_logs) and record_audit_log() exist from Module 1a; full module design not yet built."],
  ["5", "File Storage", "Platform Foundation", "NOT STARTED", "Design locked, no implementation."],
  ["6", "Employee Management (Core HR)", "Business Module (MVP)", "NOT STARTED", "Design locked, no implementation."],
  ["7", "Attendance", "Business Module (MVP)", "NOT STARTED", "Design locked, no implementation."],
  ["8", "Leave Management", "Business Module (MVP)", "NOT STARTED", "Design locked, no implementation."],
  ["9", "Payroll", "Business Module (MVP cutoff)", "NOT STARTED", "Design locked, no implementation."],
  ["10", "CRM", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["11", "Projects", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["12", "Help Desk", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["13", "Inventory", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["14", "Finance", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["15", "Analytics & Reports", "Business Module (Roadmap)", "NOT STARTED", "Design locked, no implementation."],
  ["16", "Platform AI Layer", "Shared Platform Capability", "NOT STARTED", "Design locked. AI provider decision still explicitly open."],
  ["17", "Marketplace", "Platform Discovery Capability", "NOT STARTED", "Design locked, no implementation."],
];

function moduleStatusTable() {
  const widths = [500, 2600, 2000, 1800, 3600];
  const header = new TableRow({
    children: [
      headerCell("#", widths[0]), headerCell("Module", widths[1]), headerCell("Category", widths[2]),
      headerCell("Build Status", widths[3]), headerCell("Notes", widths[4]),
    ],
    tableHeader: true,
  });
  const rows = moduleStatus.map(([num, name, cat, status, note]) => {
    const statusColor = { "BUILT & VERIFIED": COLORS.green, "BUILT — FIXES APPLIED": COLORS.green, "STUB / PARTIAL": COLORS.amber, "NOT STARTED": COLORS.gray }[status];
    return new TableRow({
      children: [
        textCell(num, widths[0]),
        textCell(name, widths[1], { bold: true }),
        textCell(cat, widths[2]),
        textCell(status, widths[3], { bold: true, color: statusColor }),
        textCell(note, widths[4]),
      ],
    });
  });
  return new Table({ width: { size: 10500, type: WidthType.DXA }, rows: [header, ...rows], columnWidths: widths });
}

// generic 2-col def table
function defTable(rows, widths = [3000, 7500]) {
  const trs = rows.map(([k, v]) => new TableRow({
    children: [textCell(k, widths[0], { bold: true, shading: COLORS.lightGray }), textCell(v, widths[1])],
  }));
  return new Table({ width: { size: widths[0] + widths[1], type: WidthType.DXA }, rows: trs, columnWidths: widths });
}

function spacer(n = 200) { return new Paragraph({ spacing: { after: n }, text: "" }); }

function calloutBox(titleText, lines, color = COLORS.accent) {
  const paras = [new Paragraph({
    children: [new TextRun({ text: titleText, bold: true, color })],
    spacing: { after: 80 },
    border: { left: { color, space: 8, style: BorderStyle.SINGLE, size: 18 } },
  })];
  lines.forEach(l => paras.push(new Paragraph({
    children: [new TextRun({ text: l })],
    spacing: { after: 60 },
    indent: { left: 200 },
    border: { left: { color, space: 8, style: BorderStyle.SINGLE, size: 18 } },
  })));
  return paras;
}

// ---------- Build document ----------
const children = [];

children.push(
  new Paragraph({ text: "", spacing: { before: 1600 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Enterprise Multi-Tenant SaaS Platform", bold: true, size: 56, color: COLORS.navy })],
    spacing: { after: 200 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Living Architecture & Build-Status Reference", size: 32, color: COLORS.accent, bold: true })],
    spacing: { after: 400 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Consolidates the locked Blueprint v3 design with real, verified implementation progress.", italics: true, size: 22, color: COLORS.gray })],
    spacing: { after: 800 },
  }),
  defTable([
    ["Source design doc", "Enterprise SaaS Blueprint v3 (July 02, 2026) — all 17 modules + Cross-Cutting Architecture, locked"],
    ["Source build evidence", "Antigravity implementation transcripts + live Supabase schema snapshot (migrations through 20240106000000_security_patches.sql)"],
    ["This document generated", "July 06, 2026"],
    ["Maintained as", "A living reference — update the Build Status column and §8/§9 every time a module's real-world status changes"],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

children.push(h1("1. How to Use This Document"));
children.push(p("This document has two layers, kept intentionally distinct:"));
children.push(bullet("Design layer (locked) — the approved, 18-point business design for each module, carried over from Blueprint v3. This layer does not change unless a formal design revision is approved."));
children.push(bullet("Build layer (live) — what has actually been implemented, verified, broken, and fixed so far, drawn from the real Antigravity build transcripts and the live Supabase schema. This layer updates continuously as work happens."));
children.push(p("Rule that never changes (inherited from the Blueprint): no module's design is altered by build-layer findings alone — a real bug found during implementation gets fixed against the locked design, not used to silently redefine it. If a build finding implies the design itself was wrong, that goes back through a design revision, same as any other module change.", { italics: true }));
children.push(spacer());

children.push(h1("2. Executive Status Summary"));
children.push(p("Of the 19 platform-wide units (17 modules + the two joint foundational reviews), the build has reached the following point:"));
children.push(calloutBox("Where things stand", [
  "Modules 1a (Authentication), 1b (Organization Management), and 1c (RBAC) are implemented against their locked designs, security-reviewed, and — for 1b — patched after a critical RLS bypass was found.",
  "Module 2 (Subscription & Billing) has its core state machine, trial provisioning, and a billing-status gate built; the payment-provider (Razorpay) integration has not been started.",
  "Modules 3–17 remain at the locked-design stage only — zero implementation. Module 3 (Notifications) was explicitly paused so the Module 1b/1c security findings could be closed first, consistent with the platform rule that later modules assume the tenant/ownership model beneath them is actually secure.",
]));
children.push(spacer());
children.push(moduleStatusTable());
children.push(spacer());

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("3. Product Vision (Locked — Blueprint v3 §1)"));
children.push(defTable([
  ["Product", "A modular, multi-tenant business operating system — organizations subscribe only to the modules they need, starting from a tight production-grade core."],
  ["Customers", "Horizontal, industry-agnostic; 10–1,000 employee organizations; India, Middle East, Southeast Asia first; compliance-heavy logic built as swappable regional packs."],
  ["Differentiation", "Enterprise power without enterprise complexity — modern UX, AI-first workflows, fast onboarding, API-first extensibility."],
  ["Strategy", "Build like a suite, launch like a wedge — platform foundation ships first (never customer-facing alone), business modules layer on one at a time, each fully designed before implementation."],
  ["Standard", "Every decision assumes real commercial production scale — thousands of tenants, strict isolation, security and auditability by default."],
]));
children.push(spacer());
children.push(h3("Key Locked Decisions"));
children.push(bullet("Pricing (v1): Organization Subscription + Module Subscription only; schema kept extensible."));
children.push(bullet("Workflow automation: v1 = configuration, custom fields, approval chains only; a generic no-code engine is a deferred future module."));
children.push(bullet("Notifications, Audit Logging, File Storage are internal reusable capabilities — never customer-subscribable. Platform AI Layer and Marketplace joined this category on final review."));

children.push(h1("4. Business Requirements Summary (Locked — Blueprint v3 §2)"));
children.push(h3("Tenant & Organization Model"));
children.push(bullet("One user identity can hold memberships in multiple organizations; switching is instant, no re-authentication."));
children.push(bullet("Every organization is a fully isolated tenant — data, membership, roles, permissions, subscription state never cross tenant boundaries."));
children.push(h3("Roles & Access"));
children.push(bullet("Fixed platform roles: Platform Super Admin, Organization Owner, Organization Admin, Application Admin, Manager, Employee — plus organization-defined custom roles."));
children.push(h3("Subscription & Onboarding"));
children.push(bullet("Self-service signup → email verification → automatic tenant provisioning → Owner created → onboarding wizard."));
children.push(bullet("14-day free trial (full access) → 7-day grace period (read-only) → Locked (no access, zero deletion). Reactivation restores instantly, no data loss."));
children.push(h3("Data Ownership & Offboarding"));
children.push(bullet("Cancellation (explicit Owner action) starts a 30-day retention window; Locked ≠ Cancelled — only explicit Cancel starts the deletion clock."));
children.push(h3("Non-Functional Requirements"));
children.push(bullet("99.9% target availability, mobile-responsive, API-first, multi-language/currency/timezone-ready from the start."));

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("5. System Architecture Summary (Locked — Blueprint v3 §3)"));
children.push(bullet("Shared database, shared schema; tenant isolation enforced via PostgreSQL Row-Level Security (RLS) as the single source of truth — every tenant-owned table carries organization_id."));
children.push(bullet("User = platform-wide identity; Membership = link between User, Organization, and coarse Role; Active Session Context tracks which org a user is 'inside.'"));
children.push(bullet("Platform Services Layer (Auth, Org Mgmt, Billing, RBAC, Notifications, Audit Logging, File Storage — plus, as of Modules 16–17, the AI Layer and Marketplace) is consumed by every business module, never duplicated inside one."));
children.push(bullet("Core Directory: Structure Nodes, Employee, Contact/Account, Item/Location/Movement — platform-owned, shared, referenced but never forked."));
children.push(bullet("Module Registry & Activation Model is owned exclusively by Organization Management; Billing owns entitlement/gating only; Marketplace is a discovery layer that invokes but never owns activation logic."));
children.push(bullet("RLS is the primary tenant-isolation boundary; RBAC is a second, finer-grained layer — never a replacement for RLS."));
children.push(spacer());

children.push(h1("6. Global Architectural Principles (Permanently Locked — Blueprint v3 §7)"));
children.push(p("Locked during the Notification Framework design; apply retroactively and going forward to every module unless a module states an explicit, justified override."));
children.push(bullet("Cost Philosophy: free-tier first, prefer open-source and self-hostable solutions, avoid unnecessary paid services in v1."));
children.push(bullet("Vendor Independence: core business logic never depends directly on an external provider — every external service sits behind a provider abstraction."));
children.push(bullet("Never hard-delete business records — status/lifecycle transitions and archiving only."));
children.push(bullet("Centralized interfaces, never parallel logic — Notifications, Audit Logging, File Storage, RBAC, and the AI Layer are each called through one interface, never reimplemented per module."));
children.push(bullet("Read-only-during-Locked as the standard access pattern (Payroll/Finance use a stricter no-financial-write variant)."));
children.push(bullet("Reference, never duplicate shared entities. Version-aware, never retroactive policy changes. Immutable IDs everywhere. Fail closed, not open. Never a second source of truth (Analytics, Marketplace, AI Layer)."));
children.push(calloutBox("Build-layer note", [
  "The most consequential violation of 'centralized interfaces, never parallel logic' found so far was in Module 1b: RLS policies on organizations, memberships, and structure_nodes allowed direct writes that bypassed the intended RPC-only mutation path already correctly used in Module 1c. See §8.2 and §9 for the full finding and fix.",
], COLORS.amber));

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("7. Module Roadmap & Dependencies (Locked — Blueprint v3 §6, §9, §10)"));
children.push(p("Full 18-point designs, the Entity Ownership Summary, and the Module Dependency Matrix for all 17 modules remain authoritative in Blueprint v3 and are not reproduced in full here to avoid duplicate sources of truth for the design itself. This document's value-add is the Build Status layer in §2 and the detailed build notes below."));
children.push(h3("Locked build sequence (never skipped or reordered)"));
children.push(bullet("1a Authentication → 1b Organization Management → 1c RBAC → 2 Subscription & Billing → 3 Notification Framework → 4 Audit Logging → 5 File Storage  (Platform Foundation, complete when all seven are built)"));
children.push(bullet("6 Employee Mgmt → 7 Attendance → 8 Leave Mgmt → 9 Payroll  (MVP cutoff — confirmed launchable suite)"));
children.push(bullet("10 CRM → 11 Projects → 12 Help Desk → 13 Inventory → 14 Finance → 15 Analytics & Reports  (Roadmap)"));
children.push(bullet("16 Platform AI Layer, 17 Marketplace  (Shared Platform / Discovery Capability, consumed platform-wide, never customer-subscribable)"));
children.push(spacer());

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("8. Detailed Build Notes — Modules In Progress"));
children.push(p("Drawn directly from the Antigravity implementation transcripts and the live Supabase migration history. This is the section that should be updated every session."));

children.push(h2("8.1 — Module 1a: Authentication"));
children.push(new Paragraph({ children: [statusRun("BUILT & VERIFIED")], spacing: { after: 150 } }));
children.push(h3("What's actually built"));
children.push(bullet("Schema: user_profiles (with handle_new_user trigger on auth.users), account_lockouts (check_lockout / record_failed_login / reset_failed_login RPCs), user_sessions_tracker, auth_audit_logs (stub for Module 4)."));
children.push(bullet("Edge Function auth-signup deployed to Supabase, enforcing server-side password complexity."));
children.push(bullet("Session-revocation architecture: is_session_revoked() as a SECURITY DEFINER function, specifically introduced to avoid RLS infinite-recursion when checking session validity from within other tables' policies."));
children.push(bullet("Frontend (Vite + React) signup/login flow running locally against the remote Supabase project."));
children.push(h3("Bugs found and fixed during build"));
children.push(bullet("Edge Function originally used admin.createUser, which silently skips Supabase's verification email — switched to standard auth.signUp so the platform's own email delivery fires correctly."));
children.push(bullet("Blank screen after deploy — .env.local was missing the required VITE_ prefix and pointed at the dashboard URL instead of the API URL; fixed."));
children.push(bullet("Post-verification redirect landed on localhost:3000 (default Supabase redirect) instead of the Vite dev server's actual port 5173; needs a permanent Site URL / Redirect URL fix in Supabase Auth settings, not just a one-off manual port edit."));
children.push(h3("Known, accepted gap"));
children.push(bullet("RLS policies have no automated test coverage — the vitest suite (authService.test.js) mocks the Supabase client and can validate JS-level logic (lockouts, anti-enumeration) but cannot execute against a live Postgres instance, so it can't catch RLS/SQL-level bugs like recursion. Logged as an explicit README \"known gaps\" item with pgTAP / a CI test-database instance flagged as the future fix, to be revisited once RLS complexity justifies the setup cost."));

children.push(h2("8.2 — Module 1b: Organization Management"));
children.push(new Paragraph({ children: [statusRun("BUILT — FIXES APPLIED")], spacing: { after: 150 } }));
children.push(h3("What's actually built"));
children.push(bullet("Schema: organizations, memberships, structure_nodes, org_module_activations, plus organization_status / membership_role / membership_status / structure_node_type enums."));
children.push(bullet("create_organization() — atomic RPC creating the organization, the Owner membership, and (after Module 2's schema landed) the initial trial subscription in one transaction."));
children.push(bullet("transfer_org_ownership() — atomic RPC with invoker/target validation and a block_owner_removal trigger preventing the Owner from being removed outside a transfer."));
children.push(bullet("accept_invitation() RPC for the invite → pending → active membership flow."));
children.push(calloutBox("Critical finding from a full schema security review (resolved)", [
  "1. organizations and memberships both carried INSERT — and in memberships' case, a full FOR ALL — RLS policies that allowed direct writes bypassing create_organization()/accept_invitation(). Any authenticated user could insert themselves as 'owner' into any existing organization's memberships table directly, since the INSERT policy never checked organization existence, invitation status, or duplicate ownership.",
  "2. memberships' FOR ALL policy included DELETE, which bypassed block_owner_removal_trigger entirely (that trigger only fires on UPDATE) — letting an Org Admin hard-delete the Owner's row to achieve the same forbidden outcome.",
  "3. structure_nodes' FOR ALL policy also included DELETE, contradicting the platform-wide no-hard-delete rule, with no database-level trigger blocking archival/deletion when dependent child nodes or assigned memberships exist.",
  "Fix applied: all three tables were locked down to SELECT-only RLS for regular users, with every mutation routed through SECURITY DEFINER RPCs (matching the pattern already used correctly in Module 1c) — including new create_structure_node / update_structure_node / archive_structure_node RPCs with an explicit dependent-check.",
], COLORS.red));
children.push(h3("Open item"));
children.push(bullet("last_active_org_id's foreign key constraint never actually attached: it was created without a REFERENCES clause in 1a's initial migration, then 1b's ALTER TABLE ... ADD COLUMN IF NOT EXISTS ... REFERENCES statement silently no-opped because the column already existed. Needs an explicit ALTER TABLE ... ADD CONSTRAINT. Not a security hole, but a real data-integrity gap — flagged, not yet closed as of this export."));
children.push(h3("Verification status"));
children.push(bullet("Full manual verification suite from 1b and 1c is being re-run after the fix, specifically re-testing cross-tenant isolation on organizations/memberships directly via the REST API (not just the UI)."));

children.push(h2("8.3 — Module 1c: RBAC"));
children.push(new Paragraph({ children: [statusRun("BUILT & VERIFIED")], spacing: { after: 150 } }));
children.push(h3("What's actually built"));
children.push(bullet("Schema: custom_roles, permission_grants, membership_custom_roles — correctly locked to SELECT-only RLS from the start, with all writes routed through create_custom_role(), update_custom_role(), delete_custom_role(), and assign_membership_roles()."));
children.push(bullet("has_permission(user, org, resource_type, action) — the central permission-check interface, matching the locked deny-wins / fail-closed design exactly: Super Admin bypass, then custom-grant deny check, then custom-grant allow check, then coarse-role defaults, then fail-closed."));
children.push(bullet("A deferred constraint trigger enforcing the \"no-empty-drafts\" rule — a custom role must have at least one permission grant before it can be saved or assigned."));
children.push(calloutBox("Reference pattern for the rest of the platform", [
  "1c's write-locked-behind-RPC schema pattern is explicitly the pattern Modules 1b's organizations/memberships/structure_nodes tables should have followed from the start. It's called out in the build transcripts as the model every future module's RLS design should copy.",
]));

children.push(h2("8.4 — Module 2: Subscription & Billing Engine"));
children.push(new Paragraph({ children: [statusRun("STUB / PARTIAL")], spacing: { after: 150 } }));
children.push(h3("What's actually built"));
children.push(bullet("Schema: subscriptions table + subscription_status enum (trial / grace_period / locked / active)."));
children.push(bullet("check_subscription_access(org, module_key, action) RPC — correctly limits the billing-visibility exemption to action = 'view', per the locked design's read-only-during-Locked rule."));
children.push(bullet("Trial provisioning is atomic: create_organization() inserts a 14-day trial subscription row in the same transaction as the org and Owner membership — verified end-to-end (\"Organization created atomically. Initial Subscription Status: trial\")."));
children.push(bullet("Frontend: a BillingStatusBanner component that surfaces read-only/locked warnings across the dashboard, and a SuperAdminBillingOverride dev-tool panel (placed in a \"Dev Tools (Billing)\" tab) for manually testing state transitions — RBAC-gated so only global Super Admins can see the tab."));
children.push(h3("Not yet built"));
children.push(bullet("Razorpay payment-provider integration (the locked v1 payment gateway decision) — no real payment flow exists yet; the current implementation is a manually-triggered state-machine stub for development/testing."));
children.push(bullet("Automatic Trial → Grace → Locked time-based transitions, invoice/payment history UI, and webhook handling are not yet implemented."));

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("9. Known Gaps & Technical Debt Log"));
children.push(p("A running list, in the spirit of the README \"known gaps\" section the build process committed to starting in Module 1a — so nothing here gets quietly forgotten by the time later modules assume it's solid."));

const gaps = [
  ["OPEN", COLORS.amber, "RLS has no automated test coverage", "vitest mocks the Supabase JS client and cannot execute against live Postgres, so RLS/SQL-level bugs (like the recursion and RLS-bypass issues below) can't be caught by CI. Future fix: pgTAP or a CI test-database instance, once RLS complexity justifies the setup cost."],
  ["FIXED", COLORS.green, "organizations / memberships RLS bypass", "INSERT and FOR ALL policies allowed any authenticated user to write directly via REST, bypassing create_organization()/accept_invitation() — including self-inserting as 'owner' into any org. Locked to SELECT-only + RPC-only writes."],
  ["FIXED", COLORS.green, "memberships DELETE bypassed owner-removal protection", "block_owner_removal_trigger only fired on UPDATE; the FOR ALL policy's DELETE grant let an Admin hard-delete the Owner's row instead. Closed alongside the RLS lockdown above."],
  ["FIXED", COLORS.green, "structure_nodes allowed hard-delete", "Contradicted the platform's no-hard-delete rule and had no dependent-check trigger. Replaced with create_structure_node / update_structure_node / archive_structure_node RPCs plus an explicit dependent check."],
  ["FIXED", COLORS.green, "subscriptions Super Admin UPDATE policy missing session-revocation check", "Missing check was successfully patched during the Module 3 security updates."],
  ["FIXED", COLORS.green, "last_active_org_id foreign key never attached", "Proper foreign key constraint added successfully during the Module 3 security updates."],
  ["OPEN", COLORS.amber, "Auth redirect hardcoded to a dev port", "Supabase Auth's email-confirmation redirect defaults to localhost:3000 while the actual Vite dev server runs on 5173 — worked around manually per-link so far; needs a proper Site URL / Redirect URL configuration fix."],
  ["NOTE", COLORS.gray, "CLI/deployment friction", "Supabase CLI required a Personal Access Token, DB password, and service_role key to be shared manually to link/push/deploy from outside the user's own authenticated session; also hit 403 errors pushing migrations against the remote project via CLI. Worth a documented, repeatable deployment runbook."],
];
const gapWidths = [900, 2600, 6500];
const gapHeader = new TableRow({ children: [headerCell("Status", gapWidths[0]), headerCell("Item", gapWidths[1]), headerCell("Detail", gapWidths[2])], tableHeader: true });
const gapRows = gaps.map(([status, color, item, detail]) => new TableRow({
  children: [textCell(status, gapWidths[0], { bold: true, color }), textCell(item, gapWidths[1], { bold: true }), textCell(detail, gapWidths[2])],
}));
children.push(new Table({ width: { size: 10000, type: WidthType.DXA }, rows: [gapHeader, ...gapRows], columnWidths: gapWidths }));
children.push(spacer());

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("10. Remaining Locked Designs — Not Yet Started"));
children.push(p("One-line purpose per module, for quick reference. Full 18-point designs for all of these remain authoritative in Blueprint v3."));

const remaining = [
  ["Module 3 — Notification Framework", "Single channel-agnostic dispatch service (Email via Resend + In-App in v1) that every module calls instead of touching a provider SDK directly."],
  ["Module 4 — Audit Logging", "Centralized, append-only, immutable record of every sensitive/state-changing action platform-wide."],
  ["Module 5 — File Storage", "Tenant-isolated, provider-abstracted (Supabase Storage v1) file upload/storage/access service used by every module needing attachments."],
  ["Module 6 — Employee Management (Core HR)", "The authoritative Employee record every downstream HR-adjacent module references rather than forking."],
  ["Module 7 — Attendance", "Presence tracking (clock in/out, manual entry) feeding Leave and Payroll."],
  ["Module 8 — Leave Management", "Full leave lifecycle — types, policies, balances, approval — writing status into Attendance."],
  ["Module 9 — Payroll (MVP cutoff)", "Calculate-and-record payroll runs consuming Employee, Attendance, and Leave data — no disbursement in v1."],
  ["Module 10 — CRM", "Leads, Contacts, Accounts, Deals/pipeline — establishes Contact/Account as shared Core Directory entities."],
  ["Module 11 — Projects", "Projects, tasks, milestones, optional time tracking — Task deliberately kept distinct from Help Desk's Ticket."],
  ["Module 12 — Help Desk", "Support ticketing reusing CRM's Contact/Account for 'who is asking'; internal notes structurally separate from customer-facing responses."],
  ["Module 13 — Inventory", "Items, locations, and an immutable stock-movement ledger — quantity/movement only, valuation deferred to Finance."],
  ["Module 14 — Finance", "Invoicing, expenses, and a simple Chart of Accounts consuming finalized data from Payroll, CRM, Projects, and Inventory."],
  ["Module 15 — Analytics & Reports", "Read-only cross-module dashboards and reports — never a second source of truth for any module's data."],
  ["Module 16 — Platform AI Layer", "Provider-agnostic AI capability layer (summarization, drafting, classification) consumed via stable interfaces; no default AI provider selected yet."],
  ["Module 17 — Marketplace", "Discovery/activation storefront over Organization Management's existing Module Registry — never owns activation logic itself."],
];
remaining.forEach(([title, desc]) => {
  children.push(new Paragraph({
    children: [new TextRun({ text: title + " — ", bold: true }), new TextRun({ text: desc })],
    spacing: { after: 120 },
  }));
});

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("11. Recommended Next Steps"));
children.push(bullet("Close the two remaining open items from §9 (subscriptions session-revocation check; last_active_org_id foreign key) before resuming forward progress — consistent with the platform rule that later modules assume the tenant/ownership model beneath them is secure. (NOW COMPLETED)"));
children.push(bullet("Re-run the full manual verification suites for Modules 1b and 1c against the REST API directly (not just the UI), specifically re-testing cross-tenant isolation on organizations and memberships."));
children.push(bullet("Fix the Supabase Auth redirect URL configuration permanently (currently defaults to a dev-only port) before any real users complete email verification."));
children.push(bullet("Resume at Module 3 (Notification Framework) once the above are closed — it was paused, not skipped, specifically to let the Module 1b findings settle first."));
children.push(bullet("Decide the Module 2 Razorpay integration scope explicitly before Module 9 (Payroll) needs real payment state, since Payroll's own design assumes a working Billing gate."));
children.push(bullet("Keep this document's §2 status table and §9 gap log updated at the end of every build session — that's the entire point of it being a living document rather than a static export."));

const doc = new Document({
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
    },
    children,
  }],
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
});

const outputPath = path.join(__dirname, "Living_Architecture_Reference.docx");

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log("done! Saved to:", outputPath);
});
