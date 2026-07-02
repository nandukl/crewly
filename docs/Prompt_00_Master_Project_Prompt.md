# PROMPT 00 — MASTER PROJECT PROMPT
## Crewly: Enterprise Multi-Tenant SaaS Platform
### Persistent Context for Google Antigravity — Provided Once, Assumed By Every Subsequent Module Prompt

---

## 0. HOW TO USE THIS PROMPT

You (Antigravity) are the AI coding agent implementing **Crewly**, a modular, multi-tenant enterprise SaaS platform. This document is your **permanent project context**. It will not be repeated in full inside future prompts — every module-specific implementation prompt (Prompt 01, Prompt 02, … Prompt N) assumes you have this entire document loaded and internalized before reading a single line of module-specific instructions.

Each future prompt will contain **only**:
- The specific module's finalized 18-point design
- Any net-new implementation instructions for that module
- References back to sections of this document by number (e.g., "per §5 Global Architectural Principles" or "per §6 Golden Rule 3")

You must never ask the business-design questions this document already answers. You must never reinterpret, soften, or "improve" any locked decision below. If something in a module prompt appears to conflict with this document, **this document wins**, and you should flag the conflict rather than silently resolving it.

---

## 1. PRODUCT VISION

**Product:** A modular, multi-tenant business operating system that lets organizations subscribe to only the modules they need — starting with a tight, production-grade core and expanding into a full suite over time.

**Customers:** Horizontal, industry-agnostic. Organizations from 10–1,000 employees, initially prioritizing India, the Middle East, and Southeast Asia, with compliance-heavy logic (payroll, tax) built as swappable regional packs rather than hardcoded assumptions.

**Differentiation:** Enterprise power without enterprise complexity — modern UX, AI-first workflows, fast onboarding, and a clean, API-first, extensible module system.

**Strategy:** Build like a suite, launch like a wedge. Platform foundation (auth, org management, subscriptions, RBAC, notifications, audit, storage) ships first and is never customer-facing on its own. Business modules layer on top one at a time, each independently maintainable and loosely coupled, each fully designed before implementation begins.

**Standard:** Every decision assumes a real commercial product at production scale — thousands of tenants, strict tenant isolation, security and auditability by default.

**Key Locked Product Decisions:**
- Pricing (v1): Organization Subscription + Module Subscription only. Schema stays extensible for future pricing models — do not build those models now.
- Workflow automation: v1 modules get configuration, custom fields, and approval chains only. A generic no-code workflow engine is an explicitly deferred future module — do not build it.
- Platform services (Notifications, Audit Logging, File Storage, Platform AI Layer, Marketplace) are internal, reusable capabilities — never customer-subscribable modules.

---

## 2. MVP AND BUILD SEQUENCE (LOCKED)

Modules are implemented **one at a time, in this exact order**, never out of sequence, never in parallel, never partially:

| # | Module | Category |
|---|--------|----------|
| 1a | Authentication | Platform Foundation |
| 1b | Organization Management | Platform Foundation |
| 1c | RBAC | Platform Foundation |
| 2 | Subscription & Billing Engine | Platform Foundation |
| 3 | Notification Framework | Platform Foundation |
| 4 | Audit Logging | Platform Foundation |
| 5 | File Storage | Platform Foundation |
| 6 | Employee Management (Core HR) | Business Module (MVP) |
| 7 | Attendance | Business Module (MVP) |
| 8 | Leave Management | Business Module (MVP) |
| 9 | Payroll | Business Module (MVP cutoff — launchable suite complete here) |
| 10 | CRM | Business Module (Roadmap) |
| 11 | Projects | Business Module (Roadmap) |
| 12 | Help Desk | Business Module (Roadmap) |
| 13 | Inventory | Business Module (Roadmap) |
| 14 | Finance | Business Module (Roadmap) |
| 15 | Analytics & Reports | Business Module (Roadmap) |
| 16 | Platform AI Layer | Shared Platform Capability |
| 17 | Marketplace | Platform Discovery Capability |

Modules 1a/1b/1c were designed jointly as one cohesive identity/tenant/access unit but are implemented as **three separate, focused builds** with three separate prompts. Modules 16 and 17 are **not** customer-subscribable business modules — they are shared, platform-wide capabilities, architecturally identical in status to Notifications/Audit Logging/File Storage.

You never skip ahead to a later module, never borrow logic from an unbuilt module, and never anticipate a future module's schema beyond what its owning module has already locked in the Dependency Matrix (§7).

---

## 3. GLOBAL ARCHITECTURAL PRINCIPLES (PERMANENTLY LOCKED)

These were locked during the Notification Framework design and apply **retroactively and going forward to every module**, without exception, unless a specific module design states an explicit, justified override.

1. **Cost Philosophy:** Prioritize free-tier services. Prefer open-source software wherever practical. Prefer self-hostable solutions when they provide long-term advantages. Avoid unnecessary paid services during Version 1.
2. **Vendor Independence:** Core business logic must never depend directly on any external provider. Every external service (Authentication, Database, Storage, Email, SMS, Payment, AI, Search, Monitoring, Analytics, etc.) must be accessed through a provider abstraction.
3. **Free-Tier First Design:** Version 1 assumes a startup operating with minimal infrastructure cost while remaining scalable.
4. **Open Standards:** Prefer open protocols, open APIs, standard formats, and open-source libraries wherever practical.
5. **Future Flexibility:** Every external dependency must be replaceable without redesigning business modules.

### Recurring Platform-Wide Patterns (established module by module, now standard everywhere)

- **Never hard-delete business records.** Status/lifecycle transitions and archiving only. Applies to Organization, Employee, Leave, CRM, Projects, Help Desk, Inventory, Finance, and every module thereafter.
- **Centralized interfaces, never parallel logic.** Every module routes notifications through the Notification Framework, every sensitive action through Audit Logging, every file operation through File Storage, every access decision through RBAC, and every AI capability through the Platform AI Layer. No module reimplements these.
- **Read-only-during-Locked.** The standard pattern (view/read allowed, all writes blocked) applies to Audit Logs, Billing/Subscription/Org info, File Storage, Analytics, and every subscribable Business Module. Payroll and Finance use a **stricter** variant: no financial-state-changing action at all while Locked.
- **Reference, never duplicate.** Every module references shared entities (Employee ID, Structure Node, Contact/Account ID, Item/Location ID) rather than copying their data.
- **Version-aware, never retroactive.** Policy/configuration changes (leave policy, attendance policy, salary structure, task/pipeline status sets, inventory policies, prompt templates, dashboard definitions) apply prospectively only; historical records and calculations remain exactly as they were at the time.
- **Immutable IDs everywhere.** Every core entity across every module carries a stable, immutable internal ID independent of any mutable display value (name, email, slug, SKU).
- **Fail closed, not open.** Unrecognized/unconfigured access checks (RBAC), missing templates (Notifications), and unconfigured AI capability requests (Platform AI Layer) default to denial/safe-failure, never silent success.
- **Never a second source of truth.** Analytics, Marketplace, and the Platform AI Layer are each explicitly designed to read through owning modules' stable interfaces rather than becoming secondary data stores.

---

## 4. GOLDEN RULES (NON-NEGOTIABLE)

These are the rules that, if violated, invalidate the implementation regardless of how well it otherwise functions.

1. **RLS is the primary tenant-isolation boundary. RBAC is secondary.** RBAC never replaces or substitutes for Row-Level Security. Every tenant-owned table carries `organization_id`, and RLS is the single source of truth for isolation — never application code alone.
2. **No module writes another module's data.** Every module owns its entities exclusively (see §7 Entity Ownership). Downstream modules **reference by immutable ID**, they never fork, copy, recalculate, or override upstream data. Finance never recalculates Payroll's numbers. Analytics never becomes a secondary data store. The Platform AI Layer never persists calling-module content.
3. **No parallel logic for shared concerns.** Access checks always go through RBAC's central `can(user, action, resource)` interface. Notifications always go through the Notification Framework's `notify()` interface. Sensitive actions always emit to Audit Logging's ingestion interface. Files always go through File Storage's upload/download interface. AI capability always goes through the Platform AI Layer's `generate()` interface. **No module ever calls an external provider SDK directly** — not Supabase Storage, not Razorpay, not Resend, not an AI provider, nothing.
4. **Nothing is ever hard-deleted.** Every business entity uses status/lifecycle transitions and soft-delete/archiving. This applies platform-wide with no exceptions.
5. **Immutable ledgers stay immutable.** Attendance corrections, Leave balance transactions, Inventory Stock Movements, Finance Valuation Entries, and Payroll Finalized Runs are never edited or deleted after creation. Corrections are always new, offsetting entries.
6. **Subscription enforcement is centralized.** Trial → Grace Period → Locked → Reactivated state is enforced as a single cross-cutting gate owned exclusively by the Subscription & Billing Engine. No module implements its own subscription check.
7. **Fail closed.** Any unrecognized, unconfigured, or ambiguous access/notification/AI-capability/billing check defaults to denial. Never silent success, never a soft pass-through.
8. **No implementation proceeds without an approved design.** If a module prompt's instructions are ambiguous or a business rule is missing, that gap goes back to design — you must flag it, never invent or assume a business rule.
9. **Provider abstraction is mandatory, always.** Every external dependency (payment, email, storage, AI, and any future SMS/push/OAuth provider) sits behind an internal interface. Swapping the concrete provider must require **zero changes** to any calling module's business logic.
10. **The architecture is locked. You do not redesign it.** See §16.

---

## 5. MODULE OWNERSHIP & THE CORE DIRECTORY

### 5.1 Platform Services Layer (consumed by every module, never duplicated inside one)
Authentication, Organization Management, Subscription & Billing, RBAC, Notification Framework, Audit Logging, File Storage — plus, as shared platform-layer capabilities, Platform AI Layer and Marketplace.

### 5.2 Core Directory (platform-owned, shared entities — referenced, never forked)
- **Structure Node** — owned by Organization Management
- **Employee** — owned by Employee Management
- **Contact / Account** — owned by CRM
- **Item / Location / Movement** — owned by Inventory

### 5.3 Full Entity Ownership Table

| Entity | Owning Module | Never Duplicated By |
|---|---|---|
| User | Authentication | All modules |
| Organization | Organization Management | All modules |
| Membership | Organization Management | All modules |
| Structure Node | Organization Management | All modules |
| Module Registry & Activation State | Organization Management | All — Billing owns entitlement/gating only; Marketplace never owns registry data |
| Custom Role / Permission Group | RBAC | All modules |
| Subscription / Organization Status | Subscription & Billing Engine / Org Mgmt (structural status only) | All modules |
| File / File ID | File Storage | All modules |
| Audit Event | Audit Logging | All modules (write-only, one-way) |
| Employee | Employee Management | All modules |
| Attendance Record | Attendance | Leave (writes status only, doesn't own record) |
| Leave Request / Balance | Leave Management | All modules |
| Payroll Run / Payslip | Payroll | All modules |
| Contact / Account | CRM | All modules |
| Project / Task | Projects | Help Desk (Ticket is a distinct entity) |
| Ticket / Comment / Category / Queue | Help Desk | All — Ticket never merges with Project Task |
| Item / SKU / Location / Stock Movement | Inventory | All — stock quantity never directly writable by any consuming module |
| Invoice / Expense Claim / Payment Record / Valuation Entry / Chart of Account / Financial Period | Finance | All — Finance never recalculates Payroll/CRM/Projects/Inventory source data |
| Dashboard / Report Definition / Widget / Scheduled Report / Report Template | Analytics & Reports | All — Analytics never becomes a secondary source of business data |
| AI Request / AI Capability / AI Configuration / AI Provider / AI Usage Record | Platform AI Layer | All — AI Layer never persists calling-module content, only metering metadata |
| Marketplace Listing / Extension / Category / Bundle / Review Request / Publication Record | Marketplace | All — Marketplace never owns activation logic or the Dependency Matrix itself |

### 5.4 Module Dependency Matrix (authoritative — you must not invent new cross-module dependencies beyond this)

| Module | Depends On | Consumed By |
|---|---|---|
| 1a Authentication | — | All modules |
| 1b Organization Mgmt | Authentication | RBAC, Billing, Employee Mgmt, all business modules; owns Module Registry |
| 1c RBAC | Org Mgmt, Authentication | All modules |
| 2 Billing | Org Mgmt | All subscribable modules, Org Mgmt (status display), Marketplace (gating display) |
| 3 Notifications | Authentication | All modules, Analytics (scheduled delivery) |
| 4 Audit Logging | — | All modules |
| 5 File Storage | RBAC, Billing, Audit Logging | Employee Mgmt, Payroll, CRM, Projects, Help Desk, Inventory, Finance |
| 6 Employee Mgmt | Org Mgmt, RBAC, File Storage, Billing | Attendance, Leave, Payroll, Projects, Help Desk, Inventory, Finance |
| 7 Attendance | Employee Mgmt, RBAC, Billing | Leave (status target), Payroll (input) |
| 8 Leave Mgmt | Employee Mgmt, Attendance (writes into), RBAC, Billing | Payroll (input) |
| 9 Payroll | Employee Mgmt, Attendance, Leave Mgmt, RBAC, File Storage, Billing | Finance (finalized cost input) |
| 10 CRM | RBAC, File Storage, Billing, Employee Mgmt (ref) | Projects, Help Desk, Finance, Marketplace (future) |
| 11 Projects | RBAC, File Storage, Billing, CRM (optional), Employee Mgmt | Finance (future) |
| 12 Help Desk | CRM, Employee Mgmt, RBAC, File Storage, Notifications, Audit Logging, Billing | Analytics, Platform AI Layer (future) |
| 13 Inventory | Employee Mgmt, File Storage, Notifications, Audit Logging, RBAC, Billing | Finance, Projects (future), Marketplace (future) |
| 14 Finance | CRM, Projects (future), Payroll, Inventory, Employee Mgmt, RBAC, File Storage, Notifications, Audit Logging, Billing | Analytics |
| 15 Analytics | Every business module, RBAC, Notifications, Audit Logging, Billing, File Storage | Owner/Admin dashboards, future AI NL querying |
| 16 Platform AI Layer | RBAC (capability check), Billing (module gate), Audit Logging (metadata-only), Notifications (Super Admin alerts) | Help Desk, CRM, Analytics, any future module |
| 17 Marketplace | Org Mgmt (Module Registry), Billing (gating/pricing), RBAC, Audit Logging | Owner/Admin entry point, future third-party devs |

---

## 6. MULTI-TENANCY MODEL

- **Shared database, shared schema.** Tenant isolation is enforced via PostgreSQL **Row-Level Security (RLS)**. Every tenant-owned table carries `organization_id`. RLS is the single source of truth for isolation — application code is defense-in-depth, never the primary boundary.
- **User = platform-wide identity**, independent of any organization.
- **Membership = link** between User, Organization, and a coarse platform Role (Platform Super Admin, Organization Owner, Organization Admin, Application Admin, Manager, Employee).
- **One user, many memberships.** A single identity can belong to multiple, fully isolated organizations.
- **Active Session Context** determines which organization the user is currently "inside." Switching organizations swaps context — it never requires re-authentication.
- **Platform Super Admin** access is a deliberate, tightly controlled, **always-logged** exception to normal tenant isolation. It is never reachable via any org-level configuration.
- Scalability target: RLS + shared schema must scale to thousands of organizations on Supabase without per-tenant infrastructure. A future database-per-tenant migration path remains architecturally open but is not built in v1.

---

## 7. TECHNOLOGY STACK (LOCKED)

- **Frontend:** React.js + Vite + Tailwind CSS. Mobile-responsive web. WCAG 2.1 AA accessibility target from the first implementation.
- **Backend / Database / Auth / Storage:** Supabase — PostgreSQL, Supabase Auth, Supabase Storage (free tier). RLS enabled on every table, non-negotiable.
- **Payment Provider (v1):** Razorpay, behind a Payment Provider abstraction. Stripe/PayU/PayPal are future adapters — never hardcoded assumptions.
- **Email Provider (v1):** Resend, behind a Notification Provider abstraction. SES/Mailgun/SendGrid/Postmark/SMTP are future adapters.
- **AI Runtime (v1 default philosophy):** Self-hosted open-source models (Ollama or vLLM), behind a provider-agnostic interface. Anthropic Claude, OpenAI, Gemini, Groq, OpenRouter are available as interchangeable cloud adapters — **no default cloud provider is locked**; this remains an explicitly open decision pending a future explicit choice.
- **CI/CD substrate:** GitHub. Automated build and test required before merge — no direct-to-production path.
- **API surface:** One REST, JSON, API-first surface across every module. URI-based versioning (`/api/v1/...`). Additive/backward-compatible changes preferred within a version; breaking changes require a new version path with a defined deprecation window.
- **Operational observability:** Free-tier-first open-source stack (e.g., Grafana/Prometheus or equivalent), correlated end-to-end via a shared Correlation ID.

You must never introduce a new core technology (a different database, a different frontend framework, a different auth system) without it being explicitly raised as an open decision — consistent with the rule that external dependencies are never assumed.

---

## 8. REPOSITORY & PROJECT STRUCTURE EXPECTATIONS

- Single platform surface (frontend + backend) — **a microservices split is explicitly not pursued in v1**, consistent with Free-Tier First Design and Cost Philosophy.
- Code is organized module-by-module in a way that mirrors the Blueprint's module boundaries (§5.4), so that a module's implementation can be located, reviewed, and reasoned about independently — even though it deploys as part of one surface.
- Every module ships with:
  - Its own data model (migrations) scoped by `organization_id` and RLS policies
  - Its own API resource routes under `/api/v1/...`
  - Its own frontend views/components
  - A developer-facing README, kept in sync as the module is implemented
  - Generated OpenAPI documentation for its endpoints, kept in sync
- Distinct, fully isolated **development, staging, and production** environments. No credential is ever shared across them.
- Every external-provider credential (Razorpay, Resend, Supabase, any future AI adapter) lives in environment-scoped secrets — **never** hardcoded, **never** committed to source control.
- Provider adapters (payment, email, storage, AI) live behind their abstraction interfaces in a clearly separated location — never inlined into business-module code.

---

## 9. CODING STANDARDS

- **Server-side validation is always authoritative.** Client-side validation is a UX convenience only and is never trusted as an enforcement boundary.
- A **shared validation library** is used by every module's forms and API endpoints — no module reimplements its own validation logic.
- Every value is sanitized against injection before persistence, with particular discipline around any field later rendered inside a Notification template, a Help Desk ticket, or a Projects/CRM comment field. Templates never allow unescaped injection of untrusted content.
- A **single standard error envelope** (error code, human-readable message, correlation ID, field-level validation detail) is used platform-wide. No module defines its own error shape. HTTP status codes are used semantically (400/401/403/404/409/429/5xx).
- All timestamps are stored **UTC-internal**, platform-wide, with timezone conversion happening exclusively in the presentation layer.
- All monetary values are stored with an **explicit currency code** and configurable precision/rounding. An organization's default currency is a display/default concern only — it never forces a hardcoded assumption anywhere else.
- Every user-facing string is externalized to translation resource files from the first implementation, even though v1 ships a single locale.
- **Unit tests are mandatory** (not optional) for business-rule-dense logic: RBAC's deny-wins resolution, Payroll's calculation engine, Leave Management's balance-transaction ledger, and any comparable rule-dense logic in later modules.
- **Integration tests** cover locked cross-module contracts (e.g., Leave's "On Leave" event into Attendance; Attendance/Leave's finalized snapshot into Payroll; Inventory's movement ledger into Finance).
- **End-to-end tests** cover the core commercial journey: signup → trial → module activation → first business action in each MVP module.
- Database indexing strategy is considered explicitly for any module with an immutable-ledger pattern, since read-time aggregation cost compounds over time.
- Each endpoint class (read, write, report-generation) carries a target response-time budget defined at module-design time.

---

## 10. PROVIDER ABSTRACTION PHILOSOPHY

Every external dependency is accessed through an internal interface, never a direct SDK call from business logic. This is not a style preference — it is a Golden Rule (§4.9). Concretely:

- **Payment** → Payment Provider abstraction (v1: Razorpay)
- **Email** → Notification Provider abstraction (v1: Resend; In-App is the other v1 channel)
- **File Storage** → Storage Provider abstraction (v1: Supabase Storage); files referenced platform-wide by immutable **File ID**, never raw paths/URLs; access only via short-lived signed URLs, never permanent public URLs
- **AI** → AI Provider abstraction (v1 default philosophy: self-hosted Ollama/vLLM; cloud adapters available, none locked as default)
- Any future channel (SMS, WhatsApp, Push) or provider must plug into the existing contract via a new adapter — with **zero** changes to any module's dispatch/calling logic.

A module is only "done" if swapping the concrete provider behind any of its external dependencies would require no changes to that module's own business logic.

---

## 11. UI/UX EXPECTATIONS

- Modern, fast, enterprise-appropriate UX — "enterprise power without enterprise complexity."
- Mobile-responsive web across every module's UI (native mobile apps are explicitly out of scope for v1).
- WCAG 2.1 AA accessibility target adopted from the first implementation, not retrofitted later.
- Multi-language readiness is architectural from day one (externalized strings), even though only one locale ships in v1.
- Multi-currency and multi-timezone display handled at the presentation layer only, never baked into stored data.
- Read-only-during-Locked states must be visually clear to the user — a Locked or Grace-Period organization should never be confused about why an action is unavailable.
- Fast, guided onboarding: registration → email verification → automatic tenant provisioning → Organization Owner created → guided onboarding wizard, with zero manual setup required to get a working 14-day trial.

---

## 12. SECURITY REQUIREMENTS

- **RLS first, RBAC second** — restated because it is the single most important security invariant in this platform (§4.1).
- **Fail closed** on every access, notification-template, and AI-capability check (§4.7).
- **Append-only, immutable Audit Logging** for every sensitive/state-changing action platform-wide. No org-level role, including Owner, can modify or delete audit records — write access is exclusively programmatic, through the centralized ingestion interface.
- **Field-level access control** for the platform's most sensitive data tiers (Payroll compensation, Finance figures) — same strictness tier for both.
- **Anti-enumeration:** authentication errors never reveal whether an email exists.
- **Brute-force protection** via throttling/lockout on authentication; API-wide per-organization and per-user rate limiting, with rate-limit violations logged for Super Admin visibility.
- **Signed-webhook verification** is the standard pattern for any inbound webhook from any provider adapter (not just Billing's payment gateway).
- **Secrets management:** zero secrets in source control, environment-scoped credentials only, dependency vulnerability scanning as standard practice.
- **Platform Super Admin** access is a deliberate, narrow, always-audited exception — never a configurable bypass at the organization level.
- External credentials are **never assumed** — they are requested explicitly when a module needs them.

---

## 13. DEVELOPMENT RULES & WORKING RHYTHM

1. **One module at a time, in the exact sequence defined in §2** — no skipping ahead, no mixing designs or implementation across modules.
2. **No implementation begins without an approved design.** This document plus each module's locked 18-point design (Purpose, Business Problems Solved, Users Involved, User Roles, Permissions, Features, Workflows, Edge Cases, Business Rules, Validation Rules, Security Considerations, Multi-Tenant Considerations, Subscription Considerations, Notifications, Reports, Future Scalability, Dependencies, Success Criteria) is the full and only source of truth for that module.
3. **Do not invent business rules.** If a module prompt is ambiguous or silent on a rule you need, stop and surface the gap — do not guess, do not infer from a similar module, do not "fill in the obvious."
4. **Every implementation prompt is self-contained** at the point of use, but always layered on top of this Master Prompt — never assume undocumented context from prior conversation turns beyond what's written here and in the specific module prompt.
5. **Global Architectural Principles (§3) and Golden Rules (§4) apply to every module automatically** — they do not need to be restated in each module prompt, and they cannot be waived by a module prompt unless that module's own locked design explicitly states a justified override.
6. Build → automated test → review → fix → approve → next module. No direct-to-production path, ever.
7. When a module's design references another module's entity or interface, integrate against that module **as already implemented** — never re-implement or fork logic that another module already owns (§4.2, §4.3).

---

## 14. EXPLICIT INSTRUCTION: NEVER REDESIGN THE ARCHITECTURE

The business and architectural design phase for this platform is **complete and locked**. All 17 modules have finalized 18-point designs. The Cross-Cutting Platform Architecture (19 horizontal sections covering API standards, error handling, rate limiting, caching, i18n, multi-currency/timezone, validation, observability, performance, backup/DR, environment management, CI/CD, testing, security hardening, data privacy, accessibility, mobile responsiveness, documentation, and incident response) is locked. A full architectural consistency review has already been run and three corrections already applied and incorporated into every section above.

As the implementing agent, you must:

- **Never** propose a different database, a different tenancy model, a different auth system, or a different core framework.
- **Never** merge two modules' entities, ownership, or responsibilities, even if it seems more "efficient" (e.g., never merge Ticket and Project Task; never let Finance recalculate Payroll; never let Analytics become a data store).
- **Never** collapse the provider-abstraction layers "to move faster" — the abstraction is the point, not overhead.
- **Never** add scope that a module's design explicitly deferred (e.g., no tax engine in Payroll v1, no proration in Billing v1, no third-party Extension execution in Marketplace v1, no agentic AI actions in the Platform AI Layer v1).
- **Never** treat an edge case, business rule, or validation rule as optional or "nice to have later" — they are part of the locked design, not suggestions.
- If you believe a locked decision is genuinely wrong or unworkable at implementation time, **stop and raise it explicitly** as a flagged issue rather than silently deviating. A correct escalation is always preferred over a quiet redesign.

Your job in this phase is **faithful, production-grade implementation** of an already-finalized architecture — not architecture design, and not architecture review, unless explicitly asked.

---

## 15. WHAT COMES NEXT

With this Master Project Prompt established, module implementation prompts will be generated **one at a time**, strictly in the build order defined in §2, starting with:

**Prompt 01 — Module 1a: Authentication**

Each subsequent prompt will assume everything in this document as already-loaded context and will contain only that module's locked design plus any module-specific implementation instructions. Do not generate, plan, or scaffold any module ahead of the prompt that introduces it.
