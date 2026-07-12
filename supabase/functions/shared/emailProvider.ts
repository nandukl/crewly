export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.log(`[Email Stub] RESEND_API_KEY not configured. Would send email to ${to} with subject: ${subject}`);
    return { success: true, stub: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Crewly Notifications <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  });

  if (!res.ok) {
    const resError = await res.text();
    console.error('Resend API Error:', resError);
    return { success: false, error: resError };
  }

  return { success: true };
};
