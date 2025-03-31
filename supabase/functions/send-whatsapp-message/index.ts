import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const WABLAS_API_KEY = Deno.env.get("WABLAS_API_KEY");
const WABLAS_API_URL = Deno.env.get("WABLAS_API_URL");

interface RegistrationData {
  registrant_status: string
  registrant_name: string
  registrant_email: string
  registrant_whatsapp: string
  participant_name: string
  song_title: string
  song_duration: string
  category: string
  sub_category: string
  registration_ref_code: string
  event_name: string
  language: string
}

function formatWhatsAppMessage(data: RegistrationData): string {
  const registrantType = {
    personal: 'Personal',
    parents: 'Parents',
    teacher: 'Teacher'
  }[data.registrant_status] || data.registrant_status

  const isIndonesian = data.language === 'id'

  // Format message with WhatsApp markdown
  return isIndonesian
    ? `*Pendaftaran ${data.event_name} Berhasil!* 🎉\n\n` +
      `Halo *${data.registrant_name}*,\n\n` +
      `Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:\n\n` +
      `*Nomor Referensi:* ${data.registration_ref_code}\n\n` +
      `*Status Pendaftar:* ${registrantType}\n` +
      `*Nama Peserta:* ${data.participant_name}\n` +
      `*Kategori:* ${data.category}\n` +
      `*Sub Kategori:* ${data.sub_category}\n` +
      `*Lagu:* ${data.song_title}\n` +
      (data.song_duration ? `*Durasi:* ${data.song_duration}\n` : '') +
      `Kami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.\n\n` +
      `Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\n` +
      `Salam musik,\n` +
      `Tim Musical Lumina`
    : `*${data.event_name} Registration Successful!* 🎉\n\n` +
      `Hello *${data.registrant_name}*,\n\n` +
      `Thank you for registering for ${data.event_name}. Here are your registration details:\n\n` +
      `*Reference Number:* ${data.registration_ref_code}\n\n` +
      `*Registrant Status:* ${registrantType}\n` +
      `*Participant Name:* ${data.participant_name}\n` +
      `*Category:* ${data.category}\n` +
      `*Sub Category:* ${data.sub_category}\n` +
      `*Song:* ${data.song_title}\n` +
      (data.song_duration ? `*Duration:* ${data.song_duration}\n` : '') +
      `We will process your registration shortly. Please keep the reference number for future correspondence.\n\n` +
      `If you have any questions, please don't hesitate to contact us.\n\n` +
      `Musical regards,\n` +
      `Musical Lumina Team`
}

serve(async (req) => {
  try {
    const { data } = await req.json()

    if (!data || !data.registrant_whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Missing required registration data' }),
        { status: 400 }
      )
    }

    // Format the phone number to ensure it starts with country code
    const phone = data.registrant_whatsapp.replace(/^\+/, '')

    // Format the WhatsApp message
    const message = formatWhatsAppMessage(data)

    // Create form data for the API request
    const formData = new FormData()
    formData.append('phone', phone)
    formData.append('message', message)

    // Send message via Wablas API
    const response = await fetch(WABLAS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': WABLAS_API_KEY
      },
      body: formData
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp message: ${JSON.stringify(result)}`)
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
