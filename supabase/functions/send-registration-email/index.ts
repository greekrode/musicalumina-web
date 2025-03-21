import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Handlebars from 'https://esm.sh/handlebars@4.7.7'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// Create a Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface EmailData {
  registrant_status: 'personal' | 'parents' | 'teacher'
  registrant_name: string
  registrant_email: string
  registrant_whatsapp: string
  participant_name: string
  song_title: string
  song_duration?: string
  category: string
  sub_category: string
  registration_ref_code: string
  registrationId: string
  event_name: string
  language: 'en' | 'id'
  template_html: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data } = await req.json() as { data: EmailData }

    if (!data.registrant_email || !data.registration_ref_code || !data.registrationId || !data.template_html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare template data
    const templateData = {
      ...data,
      isParent: data.registrant_status === 'parents',
      isTeacher: data.registrant_status === 'teacher',
      showParticipant: data.registrant_status !== 'personal'
    }

    // Compile and use the provided template
    const template = Handlebars.compile(data.template_html)

    // Generate and send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Musica Lumina <noreply@hi.musicalumina.com>',
      to: data.registrant_email,
      subject: `${data.event_name} - ${data.language === 'id' ? 'Pendaftaran' : 'Registration'}`,
      html: template(templateData),
    });

    if (emailError) {
      console.error('Resend API error:', emailError)
      throw emailError
    }

    // Update the email_sent_at field in registrations table
    const { error: updateError } = await supabaseClient
      .from('registrations')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', data.registrationId)

    if (updateError) {
      console.error('Error updating email_sent_at:', updateError)
      // Don't throw here as the email was sent successfully
    }

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 