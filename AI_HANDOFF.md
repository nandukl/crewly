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

---

## 🚧 What to do next (Next Session)

When resuming the project, the AI should:
1. **Review the Blueprint:** Determine the exact specifications for **Module 7**. (Typically, the next logical steps after Core HR are Leave Management, Attendance Tracking, or Payroll).
2. **Expand HR Features (If required):** Add any custom HR fields (e.g., Blood Group, Emergency Contacts, Location) that the user might specify based on their blueprint.
3. **Automated Testing & Edge Cases:** Ensure edge cases around role demotions or organization deletion are strictly handled.
4. **Billing / SaaS Subscriptions:** If the blueprint calls for it, integrate Stripe/LemonSqueezy for tenant billing tied to the `organizations` table.

## 📝 Important Notes for AI
- **DO NOT** use inline `grep` or `cat` in bash. Always use the built-in specific tools (`grep_search`, `read_file`, `write_to_file`).
- **Database Migrations:** All DB changes must be written as sequential `.sql` migration files in `supabase/migrations/` and manually run by the user in the Supabase SQL Editor.
- **Foreign Key Disambiguation:** `memberships` and `user_profiles` both reference `auth.users(id)`. Do not attempt to inner join them directly via Supabase JS without fetching them separately, as the schema cache throws relation errors.
- **UI Aesthetics:** The user prioritizes modern, premium aesthetics. Ensure all components use proper padding, soft shadows, rounded corners, and Tailwind best practices.
