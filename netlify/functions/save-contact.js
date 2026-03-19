// ============================================================
//  Netlify Function: /api/save-contact
//  When a visitor submits the chatbot form:
//    1. Sends an email notification to the hospital
//    2. Sends a confirmation email to the visitor (if email provided)
//
//  Required environment variables on Netlify:
//    GMAIL_USER          — Gmail address used to send emails
//    GMAIL_APP_PASSWORD  — Gmail App Password (not your login password)
//    NOTIFY_EMAIL        — Email that receives the lead notifications
// ============================================================

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const contact = JSON.parse(event.body || '{}');
    const { name, email, phone, address, inquiry, source } = contact;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const now = new Date().toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // ── Email 1: Notify the hospital ─────────────────────────
    await transporter.sendMail({
      from: `"GCH Website" <${process.env.GMAIL_USER}>`,
      to:   process.env.NOTIFY_EMAIL,
      subject: `🏥 New Lead: ${name || 'Unknown'} — ${inquiry || 'General Inquiry'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:#1E2D40;padding:24px 28px">
            <h2 style="color:white;margin:0;font-size:1.2rem">New Contact from God's Covenant Hospital Website</h2>
            <p style="color:rgba(255,255,255,0.65);margin:6px 0 0;font-size:0.85rem">${now}</p>
          </div>
          <div style="padding:28px">
            <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
              <tr style="background:#FFF4EE">
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40;width:35%">Name</td>
                <td style="padding:10px 14px;color:#374151">${esc(name)}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40">Phone</td>
                <td style="padding:10px 14px;color:#374151"><a href="tel:${esc(phone)}" style="color:#E8722A;font-weight:600">${esc(phone)}</a></td>
              </tr>
              <tr style="background:#FFF4EE">
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40">Email</td>
                <td style="padding:10px 14px;color:#374151">${email ? `<a href="mailto:${esc(email)}" style="color:#E8722A">${esc(email)}</a>` : '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40">Address</td>
                <td style="padding:10px 14px;color:#374151">${esc(address) || '—'}</td>
              </tr>
              <tr style="background:#FFF4EE">
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40">Inquiry Type</td>
                <td style="padding:10px 14px"><span style="background:#E8722A;color:white;padding:3px 12px;border-radius:20px;font-size:0.82rem;font-weight:600">${esc(inquiry) || 'General'}</span></td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#1E2D40">Source</td>
                <td style="padding:10px 14px;color:#374151">${esc(source) || 'chatbot'}</td>
              </tr>
            </table>
            <div style="margin-top:24px;padding:16px;background:#EAF9F8;border-radius:8px;text-align:center">
              <a href="tel:${esc(phone)}" style="display:inline-block;background:#E8722A;color:white;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem">📞 Call ${esc(name)} Now</a>
            </div>
          </div>
          <div style="background:#f8fafc;padding:14px 28px;text-align:center;font-size:0.78rem;color:#94A3B8">
            God's Covenant Hospital & Maternity · Oworonsoki, Lagos · 08033254690
          </div>
        </div>
      `,
    });

    // ── Email 2: Thank-you to visitor (only if email provided) ─
    if (email) {
      await transporter.sendMail({
        from: `"God's Covenant Hospital" <${process.env.GMAIL_USER}>`,
        to:   email,
        subject: "Thank you for contacting God's Covenant Hospital",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto">
            <div style="background:#1E2D40;padding:24px 28px;border-radius:12px 12px 0 0">
              <h2 style="color:white;margin:0;font-size:1.1rem">God's Covenant Hospital & Maternity</h2>
            </div>
            <div style="padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
              <p style="color:#374151;font-size:1rem">Dear <strong>${esc(name)}</strong>,</p>
              <p style="color:#374151;line-height:1.7">Thank you for reaching out to us. We have received your message and a member of our team will contact you shortly on <strong style="color:#E8722A">${esc(phone)}</strong>.</p>
              <p style="color:#374151;line-height:1.7">If you need immediate assistance, please call or WhatsApp us:</p>
              <div style="text-align:center;margin:24px 0">
                <a href="tel:08033254690" style="display:inline-block;background:#E8722A;color:white;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:0 8px">📞 08033254690</a>
                <a href="https://wa.me/2348033254690" style="display:inline-block;background:#25D366;color:white;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:0 8px">💬 WhatsApp</a>
              </div>
              <p style="color:#94A3B8;font-size:0.85rem;margin-top:28px">God's Covenant Hospital & Maternity<br>No. 13, Oworo Road, Pako Bus Stop, Oworonsoki, Lagos</p>
            </div>
          </div>
        `,
      });
    }

    console.log(`✅ Contact saved & email sent: ${name} (${phone})`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    console.error('Save-contact error:', err.message);
    // Still return success so the user experience isn't broken
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ success: true, warning: 'Email notification failed' }),
    };
  }
};

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
