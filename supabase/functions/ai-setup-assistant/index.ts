import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Supabase server import might not resolve in all local IDE setups
import { withSupabase } from "@supabase/server";

// @ts-ignore: Deno global might not be recognized if Deno LSP isn't fully active
declare const Deno: any;

const INDUSTRY_TEMPLATES = [
  {
    key: "it_agency",
    label: "IT & Software Services",
    description: "Software development, digital agencies, IT consulting.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "projects", "crm", "helpdesk"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 12, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true },
      { name: "Work From Home", days_per_year: null, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "HRA", type: "allowance" },
      { name: "Special Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Engineering", "Design", "Sales", "Client Success", "Operations"],
    known_limitations: []
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    description: "Factories and production facilities with shift-based operations.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "inventory", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true },
      { name: "Compensatory Off", days_per_year: null, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Overtime Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" },
      { name: "ESI", type: "deduction" },
      { name: "Professional Tax", type: "deduction" }
    ],
    departments: ["Production", "Quality Control", "Warehouse", "Maintenance", "Administration"],
    known_limitations: ["Rotating/on-call shift rosters are not currently supported — Attendance assumes a simpler shift pattern."]
  },
  {
    key: "retail",
    label: "Retail & Retail Chains",
    description: "Multi-location retail operations with shift-based staff.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "inventory", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 6, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Shift Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Store Operations", "Merchandising", "Inventory", "Administration"],
    known_limitations: []
  },
  {
    key: "professional_services",
    label: "Professional Services & Consulting",
    description: "Billable-hours consulting, agencies, and client service firms.",
    recommended_modules: ["hr", "projects", "crm", "leave", "payroll", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 12, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "HRA", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Consulting", "Client Services", "Business Development", "Operations"],
    known_limitations: []
  },
  {
    key: "healthcare",
    label: "Healthcare & Clinics",
    description: "Clinics and small hospitals with clinical and administrative staff.",
    recommended_modules: ["hr", "attendance", "leave", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 10, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Clinical Staff", "Nursing", "Administration", "Facilities"],
    known_limitations: [
      "Round-the-clock rotating/on-call shift rostering is not currently supported.",
      "If you need medical-supply inventory tracking, Crewly's Inventory module is general-purpose, not built for specialized medical stock rules."
    ]
  },
  {
    key: "education",
    label: "Education & Training Institutes",
    description: "Schools, coaching centers, and training institutes.",
    recommended_modules: ["hr", "attendance", "leave", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 6, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Teaching Staff", "Administration", "Facilities"],
    known_limitations: [
      "Academic-calendar-aware leave policies (term breaks, long vacations) are not currently supported — leave uses a flat annual quota.",
      "Period/subject-based attendance is not currently supported — Attendance assumes one shift per day."
    ]
  },
  {
    key: "logistics",
    label: "Logistics, Distribution & Trading",
    description: "Warehousing, distribution, and trading companies.",
    recommended_modules: ["inventory", "hr", "attendance", "crm", "finance", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Warehouse Operations", "Logistics", "Sales", "Administration"],
    known_limitations: []
  },
  {
    key: "construction",
    label: "Construction & Real Estate",
    description: "Site-based construction and real estate development.",
    recommended_modules: ["projects", "hr", "attendance", "inventory", "finance", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Site Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Site Operations", "Engineering", "Procurement", "Administration"],
    known_limitations: [
      "Tracking non-employee/subcontracted labor (day labor, contracted crews) is not fully supported — the current model assumes everyone is a full employee record."
    ]
  }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default {
  // deno-lint-ignore no-explicit-any
  fetch: withSupabase({ auth: ["publishable"] }, async (req: any, ctx: any) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // 1. Get User
      const {
        data: { user },
        error: userError,
      } = await ctx.supabase.auth.getUser();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { orgId, conversation } = body;

      if (!orgId || !conversation) {
        return new Response(JSON.stringify({ error: 'Missing orgId or conversation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Authorization Check: Verify caller belongs to orgId with owner/org_admin role
      const { data: membership, error: membershipError } = await ctx.supabase
        .from('org_memberships')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (membershipError || !membership || !['owner', 'org_admin'].includes(membership.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden: Requires owner or org_admin role' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Rate Limiting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: rlError } = await ctx.supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('action', 'ai_setup_draft_generated')
        .gte('created_at', oneHourAgo);

      if (count !== null && count >= 10) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded: Max 10 AI setup requests per hour.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 4. Deduplication: Read existing org config
      const { data: activeModulesData } = await ctx.supabase
        .from('org_module_activations')
        .select('module_key')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      const existingModules = activeModulesData?.map((m: { module_key: string }) => m.module_key) || [];

      const { data: departmentsData } = await ctx.supabase
        .from('departments')
        .select('name')
        .eq('organization_id', orgId);
      const existingDepartments = departmentsData?.map((d: { name: string }) => d.name) || [];

      const { data: leaveTypesData } = await ctx.supabase
        .from('leave_types')
        .select('name')
        .eq('organization_id', orgId);
      const existingLeaveTypes = leaveTypesData?.map((l: { name: string }) => l.name) || [];

      // 5. Call Gemini API
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const systemInstruction = `You are Crewly's setup assistant. An organization admin is describing their
business in free text. Your job is to propose a starting configuration —
never to invent details they haven't told you.

Rules:
- Only suggest modules, leave types, salary components, and departments that
  are reasonably implied by what the admin actually said. If something is
  unclear, ask one specific clarifying question instead of guessing.
- Return ONLY valid JSON matching the schema below. No prose, no markdown
  fences, nothing outside the JSON object.
- If you don't have enough information yet, return a "needs_clarification"
  response with your question, not a premature draft.
- CRITICAL: Never suggest statutory compliance figures (tax rates, PF/ESI percentages)
  as fixed numbers — always represent these as named, editable components
  ("PF Deduction", "ESI Deduction") without a hardcoded rate, since these vary by region and
  change over time, and Crewly is not a compliance authority.
- Do NOT suggest modules, leave types, or departments that the org already has.
  Existing Modules: ${existingModules.join(', ')}
  Existing Departments: ${existingDepartments.join(', ')}
  Existing Leave Types: ${existingLeaveTypes.join(', ')}

Schema:
{
  "status": "needs_clarification" | "draft_ready",
  "clarifying_question": string | null,
  "recommended_modules": string[],
  "suggested_leave_types": [{ "name": string, "description": string }],
  "suggested_salary_components": [{ "name": string, "type": "allowance" | "deduction" }],
  "suggested_departments": string[],
  "known_limitations": string[],
  "reasoning_summary": string
}

Reference data: here are Crewly's known industry templates, each with a
recommended module set, starter leave types, and starter salary components:
${JSON.stringify(INDUSTRY_TEMPLATES, null, 2)}

When the organization's description matches one of these industries reasonably
well, base your draft on that template's defaults, adjusted for whatever
specific details the org mentioned — don't ignore the template and improvise
from nothing. If the org's business doesn't clearly match any template, build
a draft from their description directly, and don't force-fit a mismatched
template just because one exists.

If the matched template has a non-empty \`known_limitations\` array, include
those exact limitations in your \`reasoning_summary\` so the org sees them
before applying — never omit a known limitation to make the draft look more
complete than it is. Also explicitly include them in the \`known_limitations\`
array in the JSON output.`;

      const geminiPayload = {
        contents: conversation,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: "application/json",
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Gemini API Error:", errBody);
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!candidateText) {
        throw new Error("Failed to parse response from Gemini");
      }

      let parsedDraft: Record<string, unknown> | null = null;
      try {
        parsedDraft = JSON.parse(candidateText);
      } catch (e: unknown) {
        console.error("Failed to parse JSON from Gemini:", candidateText, e);
        throw new Error("Gemini returned invalid JSON");
      }

      if (!parsedDraft) {
        throw new Error("Parsed draft is null");
      }

      // Log the action
      await ctx.supabaseAdmin.from('audit_logs').insert({
        organization_id: orgId,
        actor_id: user.id,
        action: 'ai_setup_draft_generated',
        target_type: 'system',
        target_id: orgId,
        metadata: { status: parsedDraft.status }
      });

      return new Response(JSON.stringify(parsedDraft), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Edge function error:', msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  })
};
