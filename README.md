# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Multi-Tenant SaaS Platform

## Known Gaps (Module 1b)
- **RLS policies are not covered by automated tests.** Manual verification is required per change. Future consideration: implement `pgTAP` or a CI test-database instance once the platform has enough RLS complexity to justify the setup cost.
- **Module Registry:** `org_module_activations` exists in the schema, but is not read or written to by any logic yet (defaults to empty).

## KNOWN TECH DEBT: Module 2 (Subscription & Billing Engine)
> [!WARNING]
> **Module 2 is currently a STUB.** Real Razorpay integration, automatic time-based state transitions, webhook processing, invoices, and payment history are intentionally deferred to the FINAL module of this project (after Module 17). Current subscription state changes are **manual-only** via the Super Admin Dev Tools override. All access checks (`check_subscription_access`) correctly reflect the stubs.

### Module 1a: Authentication (Platform Foundation)

This project contains the foundation for a multi-tenant SaaS application. Module 1a handles authentication, user profiles, MFA, and active sessions.

### Provisioning a Platform Super Admin

Platform Super Admins are a tightly controlled identity type that can perform support actions across all organizations. For security reasons, there is **no self-service signup path** to become a Super Admin.

To provision a Super Admin:
1. Have the user sign up normally via the regular `/signup` flow.
2. Verify their email.
3. A database administrator must manually elevate their account by updating the `is_super_admin` flag in the database:
   ```sql
   UPDATE public.user_profiles 
   SET is_super_admin = true 
   WHERE email = 'admin@yourdomain.com';
   ```
4. Upon their next login, the system will detect their `is_super_admin` status and **force them to enroll in Multi-Factor Authentication (MFA)** if they haven't already. This is a non-bypassable requirement for all Super Admin accounts.
