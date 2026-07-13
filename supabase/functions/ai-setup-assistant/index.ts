import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Supabase server import might not resolve in all local IDE setups
import { withSupabase } from "@supabase/server";

// @ts-ignore: Deno global might not be recognized if Deno LSP isn't fully active
declare const Deno: any;

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
  "reasoning_summary": string
}`;

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
