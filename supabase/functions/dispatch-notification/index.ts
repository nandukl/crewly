import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { sendEmail } from "../shared/emailProvider.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the JWT from the Authorization header to verify the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { type, recipient_email, user_id, title, message, action_url, channels = ['in_app'], organization_id = null } = await req.json()

    // 1. Handle In-App Notification
    if (channels.includes('in_app') && user_id) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          organization_id,
          user_id,
          type,
          title,
          message,
          action_url
        })
      
      if (insertError) {
        console.error('Failed to insert in-app notification:', insertError)
      }
    }

    // 2. Handle Email Dispatch
    if (channels.includes('email') && recipient_email) {
      // Construct basic HTML email based on type
      let htmlContent = `<h2>${title}</h2><p>${message}</p>`
      if (action_url) {
         htmlContent += `<br/><a href="${action_url}" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">View Action</a>`
      }

      const emailResult = await sendEmail({
        to: recipient_email,
        subject: title,
        html: htmlContent
      })

      if (!emailResult.success) {
        console.error('Email Dispatch Error:', emailResult.error)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
