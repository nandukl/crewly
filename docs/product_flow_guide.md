# Crewly — Product Flow Guide
### The complete journey: landing page → sign up → onboarding → org workspace → subdomain → employee login

This is the reference for how Crewly should *feel* to use, end to end. Treat it as the source of truth for UI/UX work — hand relevant sections to Antigravity when building or fixing a specific screen.

---

## 0. The domain map (read this first — everything below depends on it)

Crewly has exactly three distinct "zones," and a user should never be confused about which one they're in:

| Zone | Domain | Who's it for | What lives here |
|---|---|---|---|
| **Public / Main** | `crewly.com` | Prospects, new signups, existing owners/admins logging in before they're routed to their org | Marketing, pricing, sign up, sign in, "find my workspace" |
| **Org workspace** | `{org-slug}.crewly.com` | Everyone who belongs to that one organization — owner, admins, managers, employees | The actual product: HR, attendance, leave, payroll, CRM, whatever modules that org rents |
| **Platform control room** | `crewly.com/super-admin` (or `admin.crewly.com`) | Only you, the Platform Super Admin | Cross-org visibility and control — never reachable from inside any org |

**Rule of thumb:** if a screen shows data from more than one organization, it can only exist in the Platform Super Admin zone. If it shows data from exactly one organization, it lives on that org's subdomain. The main domain shows no organization's data at all — it's the front door.

---

## 1. The landing page — `crewly.com`

This is your storefront. Its only jobs are: explain what Crewly is, build trust, and get the visitor into either "sign up" or "sign in" as fast as possible.

**Sections, top to bottom, and what each is *for*:**

| Section | Purpose |
|---|---|
| **Nav bar** | Logo, a few anchor links (Modules, Pricing, About), and two clear buttons: **Sign in** and **Start free trial**. Sign-up should always be the visually stronger of the two. |
| **Hero** | One sentence that says what Crewly is ("Run your business, module by module") + a one-line sub-explanation + the primary CTA (start trial). No login form here — keep the hero about the pitch, not the form. |
| **Module showcase** | A grid or carousel of the modules you actually offer (HR, Attendance, Leave, Payroll, CRM, Projects, Help Desk, Inventory, Finance...). This is your product's core differentiator — "rent only what you need" — so it deserves real visual space, not a footer mention. |
| **How it works** | 3-4 steps: sign up → set up your org → invite your team → start working. Sets expectation before they commit. |
| **Pricing** | Organization subscription + per-module pricing, laid out so it's obvious you're not selling one big bundle. If pricing isn't finalized yet, this section can say "Talk to us" instead of numbers — but the module-based structure should still be visible. |
| **Trust signals** | Security/compliance mentions (multi-tenant isolation, data residency if relevant to your India/Middle East/SEA target market), maybe a short "built for growing teams" positioning line. |
| **Footer** | Legal, contact, and a small "Existing customer? Sign in" repeat link. |

**What does NOT belong here:** any org-specific content, any employee-facing language ("clock in," "apply for leave"). This page talks to decision-makers (founders, HR heads, ops managers) evaluating whether to buy — not to their future employees.

---

## 2. Sign up — creating a new organization

This is the single most important conversion flow in the product. Keep it short.

**Step 1 — Account basics**
- Full name, work email, password (or "Sign up with Google" if you want to reduce friction later).
- No organization details yet — don't make them think about their company and their password at the same time.

**Step 2 — Email verification**
- Standard verification link/code. Until verified, they can't proceed to org creation.
- (Per your existing dev flow, `dev_email_logs` already supports a local/dev fallback for this — keep that pattern for production too, behind the Notification Framework, not a separate path.)

**Step 3 — Create the organization**
- Organization name (auto-suggests a slug as they type, e.g. "Acme Retail" → `acme-retail`)
- Slug/subdomain — editable, with a live preview: *"Your workspace will be at **acme-retail**.crewly.com"*. Check availability in real time.
- Industry, size (dropdown ranges like 10-50, 50-200 etc.), locale/timezone, default currency.
- This step is what creates: one `organizations` row, one `subscriptions` row in `trial` status, and one `memberships` row for this user as **Organization Owner**.

**Step 4 — Redirect to their new subdomain**
- The moment org creation succeeds, redirect straight to `{slug}.crewly.com` and drop them into the **Onboarding Wizard** (section 3). They should never have to manually navigate there.

**What NOT to ask at signup:** payment details. A 14-day trial should start with zero friction — don't put a card form between "I'm interested" and "I'm using it."

---

## 3. The onboarding wizard — first thing they see on their new subdomain

This runs once, right after org creation, before the real dashboard appears. Goal: get them from "empty org" to "at least one real thing set up" as fast as possible, without overwhelming them.

**Recommended steps, in order:**

1. **Welcome + confirm org basics** — show what they entered at signup, let them fix typos (logo upload happens here too, using the image cropper you've already built).
2. **Build your structure** — add departments / org units (can skip and do later; don't block on this).
3. **Choose your starter modules** — this is the moment that matters most for your business model. Show the module list with plain-language descriptions, let them activate whichever they want to try during the trial (all modules should be freely activatable during trial regardless of eventual pricing, so they can evaluate before paying).
4. **Invite your team** — optional at this stage; a "skip, I'll do this later" option should always be visible. If they do invite people, this is where roles (Admin / Manager / Employee) get assigned per-invite.
5. **Done → land on the real dashboard** — with a lightweight checklist widget that persists on the dashboard for the first few days ("2 of 5 setup steps complete") rather than forcing everything through the wizard.

**Rule:** nothing in the wizard should be a hard blocker except org basics. Everything else (structure, invites, module choices) should be skippable and revisitable later from Settings/Marketplace — people trialing software abandon wizards that feel like homework.

---

## 4. The org dashboard — what's presented after sign-in, and why each section exists

Once inside `{slug}.crewly.com`, the layout is standard SaaS shape: a left sidebar for navigation, a top bar for org switcher / notifications / profile, and a main content area. What appears in the sidebar is **filtered by two things simultaneously**: (a) which modules this org has actually rented/activated, and (b) what the logged-in user's role permits them to see.

### Sidebar sections and their job

| Section | Job | Who typically sees it |
|---|---|---|
| **Dashboard / Home** | At-a-glance KPIs relevant to the viewer — headcount, pending approvals, today's attendance snapshot, open tickets, whatever's relevant to their role. Owner/Admin see org-wide numbers; Manager sees their team's; Employee sees their own. | Everyone (content varies by role) |
| **Employee Directory (HR)** | Browse/search people, view/edit profiles, departments, designations, reporting lines. Where admins create new employee accounts. | Owner, Admin, Manager (read-mostly) |
| **Attendance** | Clock in/out, view attendance history, admins handle correction requests. | Everyone (employee sees own; admin sees org-wide) |
| **Leave** | Apply for leave, view balance, approve/reject requests (for managers), configure leave types/policies (for admins). | Everyone (scoped by role) |
| **Payroll** | Run payroll, view/download payslips, manage salary structures. Compensation data is the most sensitive tier in the platform — lock this down tightly. | Admin runs it; Employee sees only their own payslips |
| **Performance** *(if rented)* | Review cycles, self/manager reviews, goals. | Everyone (scoped by role) |
| **CRM** *(if rented)* | Accounts, contacts, deals pipeline, activity log. | Sales-oriented roles, Admin |
| **Projects** *(if rented)* | Projects, tasks, time logs. | Assigned team members, Admin |
| **Help Desk** *(if rented)* | Support tickets — internal (IT/HR helpdesk) or customer-facing depending on how you're positioning it. | Requesters see their own tickets; assigned agents see their queue |
| **Inventory** *(if rented)* | Items, stock levels, locations, movement history. | Admin, warehouse/ops roles |
| **Finance** *(if rented)* | Invoices, expenses, transactions. | Admin, Finance roles |
| **Analytics** *(if rented)* | Cross-module dashboards and reports — read-only, never a place to edit data. | Owner, Admin (usually not Employees) |
| **Marketplace** | Where the org rents/activates/deactivates modules. This is the direct expression of your "rent whichever modules you want" model — make it easy to find, not buried in Settings. | Owner, Admin only |
| **Team & Roles (RBAC)** | Manage who has which role, custom roles/permission groups, structure builder. | Owner, Admin only |
| **Audit Log** | Read-only history of sensitive actions across the org. | Owner, Admin only |
| **Billing & Subscription** | Current plan, trial/grace/locked status, invoices, payment method, module costs. | Owner only (Admins can usually view, not change payment) |
| **Org Settings** | Org profile, logo, locale/timezone/currency, subdomain (rarely changed), branding. | Owner, Admin |
| **Notifications** (bell icon, top bar, not sidebar) | In-app alerts — approvals needed, tickets assigned, payroll run complete, etc. | Everyone |

### Locked / Grace Period visual treatment
Per your own rules: when an org is in Grace Period or Locked, every write action across every module should be visibly disabled (grayed buttons, a banner explaining why, a link to Billing) — never a silent failure or a confusing "nothing happens when I click." Read access stays available so people don't feel locked out of their own data.

---

## 5. What the org subdomain should *look and feel* like

`{slug}.crewly.com` is a fully separate front door from the main marketing site — think of it as each org's private building, even though technically it's one shared app.

- **Login page at the subdomain** should be branded: the org's logo (if uploaded) and name front and center, "Sign in to {Org Name}" — not a generic Crewly login screen. This reinforces that each org is its own walled space.
- If someone lands on a slug that doesn't exist, show a clear "workspace not found" page with a link back to `crewly.com`, not a raw error.
- If a logged-out user tries to access an org they're not a member of, fail closed with a clear "you don't have access to this workspace" message — never leak whether the org exists or what's inside it.
- Once logged in, the subdomain never again shows anything from `crewly.com` marketing content — it's 100% product from here on, until they explicitly log out.
- A visible **org switcher** in the top bar (for users who belong to more than one organization) lets them jump between workspaces without a full logout/login — this is your "Active Session Context" concept from the architecture, made visible in the UI.

---

## 6. After an employee logs in — what they see and can access

This is the most common login on the whole platform, so it needs to be the most focused, not the most feature-rich.

**An Employee's home view should prioritize, in this order:**
1. **Today at a glance** — clock in/out button (if attendance is rented), leave balance summary, any pending items needing their attention (a review to complete, a ticket update).
2. **My requests** — their own leave requests, attendance correction requests, expense claims — with status (pending/approved/rejected), not a company-wide list.
3. **My payslips** — only their own, never a list of anyone else's.
4. **Notifications** — approvals, announcements, mentions.
5. **Whatever task-oriented modules apply to them** — assigned tickets, assigned tasks/projects — scoped to "assigned to me," not "all tickets in the org."

**What an Employee should never see, regardless of which modules are active:**
- Other employees' compensation, payslips, or salary structures.
- The Marketplace, Billing, RBAC/Roles, or Audit Log sections at all — these shouldn't just be disabled, they shouldn't appear in navigation.
- Org-wide analytics/reports (unless a specific report is explicitly shared with them).
- Any other organization's data — this one's enforced by RLS as the hard boundary, not just hidden in the UI.

**A Manager** sits between Employee and Admin: same personal views as an Employee, plus a "my team" layer — approve their direct reports' leave/attendance corrections, see their team's basic profile info, and (if Projects/Help Desk are active) manage their team's assigned work. Managers still shouldn't see Billing, RBAC, Marketplace, or Audit Log.

**An Organization Admin** sees everything Employee + Manager see, plus every admin-facing section from the table in §4, scoped to their one organization.

**The Organization Owner** is functionally the same as Admin plus the two things that shouldn't be delegated by default: Billing/Subscription changes and the ability to transfer or delete the organization itself.

---

## 7. The Platform Super Admin view (you)

This is deliberately not reachable from inside any organization's UI — no button, no link, nothing an org admin could stumble into.

**What it should contain:**
- A searchable list of every organization on the platform — status (trial/active/grace/locked), plan, module usage, created date.
- The ability to view (never silently edit) an org's key details for support purposes, with every view logged.
- Subscription overrides — extend a trial, manually unlock an org, apply a discount — always with a mandatory reason field that goes to the audit trail.
- Platform-wide health signals if you want them here eventually (signups this week, active orgs, module popularity) — this can start as a simple metrics page and grow later.
- No screen here should let you casually browse an org's *business* data (their employees' payslips, their CRM deals) without a clear, logged, support-justified reason — treat this access the way your own Master Prompt already describes it: "a deliberate, narrow, always-audited exception."

---

## Quick-reference: role visibility matrix

| Section | Employee | Manager | Org Admin | Org Owner | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| My attendance / leave / payslips | ✅ | ✅ | ✅ | ✅ | — |
| Team approvals (leave, corrections) | ❌ | ✅ | ✅ | ✅ | — |
| Employee Directory (full org) | ❌ | view-only | ✅ | ✅ | — |
| Run Payroll | ❌ | ❌ | ✅ | ✅ | — |
| CRM / Projects / Help Desk / Inventory / Finance | assigned-only | team-scoped | ✅ | ✅ | — |
| Analytics | ❌ | limited | ✅ | ✅ | — |
| Marketplace (rent modules) | ❌ | ❌ | ✅ | ✅ | — |
| RBAC / custom roles | ❌ | ❌ | ✅ | ✅ | — |
| Audit Log | ❌ | ❌ | ✅ | ✅ | — |
| Billing / Subscription changes | ❌ | ❌ | view-only | ✅ | — |
| Cross-org visibility | ❌ | ❌ | ❌ | ❌ | ✅ |
