const enTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Registration Confirmation - Musica Lumina</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Welcome to Musica Lumina!</h1>
        <p style="color: #666; font-size: 18px; margin: 0;">Thank you for joining our musical journey</p>
    </div>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 16px;">We're delighted to confirm your registration</p>
    </div>

    <p style="margin-bottom: 25px; color: #555;">
        Please review your registration details below. If you notice any discrepancies or need assistance, our team is
        ready to help via <a href="https://wa.me/6282161505577" target="_blank"
            style="color: #1a73e8; text-decoration: none; font-weight: 500;">WhatsApp</a>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
                Registration Reference Code: <span style="color: #1a73e8;">{registration_ref_code}</span></td>
        </tr>
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa;">
                REGISTRANT'S INFORMATION</td>
        </tr>
        <tr>
            <td
                style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; width: 40%; background-color: #fafafa;">
                Full Name</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_name}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Email
                Address</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_email}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">WhatsApp
                Number</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_whatsapp}</td>
        </tr>
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa;">
                PARTICIPANT'S INFORMATION</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Full Name
                <br><span style="font-size: 12px; color: #666;">(Will be used for certificate)</span>
            </td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{participant_name}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Song
                Title</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{song_title}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Category
            </td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{category}</td>
        </tr>
    </table>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin-bottom: 10px;">We look forward to your performance!</p>
        <br />
        <p style="font-weight: 500; color: #333; margin: 0;">Best Regards,</p>
        <p style="font-size: 18px; color: #E2A225; margin: 5px 0;">Musica Lumina Team</p>
    </div>
</body>
</html>`;

const idTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Konfirmasi Pendaftaran - Musica Lumina</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Selamat Datang di Musica Lumina!</h1>
        <p style="color: #666; font-size: 18px; margin: 0;">Terima kasih telah bergabung dalam perjalanan musik kami</p>
    </div>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 16px;">Dengan senang hati kami konfirmasi pendaftaran Anda</p>
    </div>

    <p style="margin-bottom: 25px; color: #555;">
        Silakan periksa detail pendaftaran Anda di bawah ini. Jika Anda menemukan ketidaksesuaian atau membutuhkan bantuan,
        tim kami siap membantu melalui <a href="https://wa.me/6282161505577" target="_blank"
            style="color: #1a73e8; text-decoration: none; font-weight: 500;">WhatsApp</a>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
                Nomor Referensi Pendaftaran: <span style="color: #1a73e8;">{registration_ref_code}</span></td>
        </tr>
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa;">
                INFORMASI PENDAFTAR</td>
        </tr>
        <tr>
            <td
                style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; width: 40%; background-color: #fafafa;">
                Nama Lengkap</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_name}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Alamat
                Email</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_email}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Nomor
                WhatsApp</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{registrant_whatsapp}</td>
        </tr>
        <tr>
            <td colspan="2"
                style="font-weight: bold; font-size: 18px; text-align: center; border: 1px solid #e0e0e0; padding: 15px; background-color: #f8f9fa;">
                INFORMASI PESERTA</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Nama Lengkap
                <br><span style="font-size: 12px; color: #666;">(Akan digunakan untuk sertifikat)</span>
            </td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{participant_name}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Judul
                Lagu</td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{song_title}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #e0e0e0; padding: 12px; font-weight: 500; background-color: #fafafa;">Kategori
            </td>
            <td style="border: 1px solid #e0e0e0; padding: 12px;">{category}</td>
        </tr>
    </table>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin-bottom: 10px;">Kami menantikan penampilan Anda!</p>
        <br />
        <p style="font-weight: 500; color: #333; margin: 0;">Salam Hormat,</p>
        <p style="font-size: 18px; color: #E2A225; margin: 5px 0;">Tim Musica Lumina</p>
    </div>
</body>
</html>`;

interface TemplateData {
  registration_ref_code: string;
  registrant_name: string;
  registrant_email: string;
  registrant_whatsapp: string;
  participant_name: string;
  song_title: string;
  category: string;
  [key: string]: string | undefined;
}

function parseTemplate(template: string, data: TemplateData): string {
  return template.replace(
    /{(\w+)}/g,
    (match, key) => data[key]?.toString() || match
  );
}

export function loadEmailTemplate(language: 'en' | 'id', data: TemplateData): string {
  console.log('Loading template for language:', language);
  const template = language === 'id' ? idTemplate : enTemplate;
  return parseTemplate(template, data);
}
