# AI Handoff Document - Crewly SaaS

This document serves as the absolute source of truth for the project's current state, what has been completed, and what needs to be worked on next. It is designed to rapidly onboard an AI agent to continue development seamlessly.

## 🏗️ Architecture & Stack
- **Frontend**: React (Vite), Tailwind CSS, React Router, React Hook Form, Zod.
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage).
- **Core Paradigm**: Multi-tenant SaaS where users belong to `organizations` via `memberships`. Strict Row-Level Security (RLS) is enforced across all tables based on `organization_id` and active memberships.

---

## ✅ Completed Modules

### Module 1: Authentication & User Profiles
- Supabase Auth setup.
- `user_profiles` table linked to `auth.users` for global user data.
- Login and Signup flows.

### Module 2: Organization Management (Multi-tenant Foundation)
- `organizations` table (tenant records) and `memberships` table (mapping users to tenants).
- Switchable organization context via `OrgContext`.
- **Module 2b (Custom Roles)**: Added `custom_roles` and `membership_custom_roles` to allow granular permissions beyond standard 'owner/admin/member'. Built a "Structure Builder" UI to visualize roles.

### Module 3: Notification Framework
- Created a `notifications` table for centralized, channel-agnostic alerting.
- Built a global `NotificationBell` component for in-app alerts.

### Module 4: Advanced Audit Logging
- Built a robust PostgreSQL trigger function (`audit_trigger_func`) that automatically captures `INSERT`, `UPDATE`, and `DELETE` events.
- Stores historical `old_record` and `new_record` data in a JSONB `audit_logs` table.
- Attached a UI (`AuditLogViewer`) to the Org Dashboard.

### Module 5: Secure File Storage
- Integrated Supabase Storage with a private `workspaces` bucket.
- Storage path paradigm: `{organization_id}/{feature_name}/{filename}`.
- Created `file_records` Postgres table to track metadata, secured with RLS.
- Built an interactive **Image Cropper** (`react-easy-crop`) for uploading perfectly rounded Org Logos.
- Modified Dashboard and OrgProfile to fetch and display private images securely via signed URLs.

### Module 6: Employee Management (Core HR)
- Created `departments` and `employee_profiles` tables.
- **Automated Provisioning**: Built a database trigger (`tr_ensure_employee_profile`) that automatically inserts an HR profile row the moment a user accepts an invite / gets a membership.
- Built the **Employee Directory UI** and **Employee Profile Modal** for admins to manage Designations, Departments, Date of Joining, and Managers.
- Handled frontend relational joining for `user_profiles` to bypass Supabase schema cache limitations.

### Module 7 to 15: Core Operational Modules
- Built comprehensive modules for **Attendance**, **Payroll**, **Performance Reviews**, **Finances**, and **Analytics**.
- Each module has dedicated database schemas, RLS policies, and extensive React UI containers.

### Module 17: Marketplace (App Store)
- Implemented an internal App Store for Organization Admins to discover, activate, and deactivate modular features.
- Wired global state to dynamically filter the sidebar navigation based on which modules are active for the tenant.

### Architecture Redesign: Multi-Tenant Subdomain Routing
- Transformed the app into an enterprise multi-tenant structure.
- **Main Domain**: (`crewly.com` / `localhost:5173`) is strictly reserved for marketing, creating new workspaces (Orgs), and Admin logins.
- **Tenant Domain**: Each organization has a unique `slug`. Employees log in at `company.crewly.com` (or `http://[slug].localhost:5173` locally).
- **Direct Employee Creation**: Admins bypass the standard email invite link system and create employees directly from the Directory using a secure `SECURITY DEFINER` Postgres RPC. Temporary passwords are automatically generated and emailed to the user.
- **Resend Integration**: Integrated the Resend Email API directly to trigger onboarding emails containing the tenant URL and credentials.

---

## 🚧 What to do next (Next Session)

When resuming the project, the AI should:
1. Review the progress to date.
2. Determine the next feature or module to build based on the user's commands.
3. Keep refining the Tenant Subdomain routing and consider building out tenant-specific branding settings (e.g. primary color overrides).

## 📝 Important Notes for AI
- **DO NOT** use inline `grep` or `cat` in bash. Always use the built-in specific tools (`grep_search`, `read_file`, `write_to_file`).
- **Database Migrations:** All DB changes must be written as sequential `.sql` migration files in `supabase/migrations/` and manually run by the user in the Supabase SQL Editor.
- **Foreign Key Disambiguation:** `memberships` and `user_profiles` both reference `auth.users(id)`. Do not attempt to inner join them directly via Supabase JS without fetching them separately, as the schema cache throws relation errors.
- **UI Aesthetics:** The user prioritizes modern, premium aesthetics. Ensure all components use proper padding, soft shadows, rounded corners, and Tailwind best practices.
