import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Y76V3Dp2_PNFk4YqpA8UHVYeMJtdsqKou';
const DEFAULT_EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'noreply@myfevent.io.vn';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send email using Resend API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise} Email sending result
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    if (!resend) {
      throw new Error('RESEND_API_KEY is not set.');
    }

    let from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || DEFAULT_EMAIL_FROM;
    
    if (from && from.includes('<') && from.includes('>')) {
      const emailMatch = from.match(/<([^>]+)>/);
      if (emailMatch) {
        from = emailMatch[1];
      }
    }
    
    if (!from) {
      throw new Error('EMAIL_FROM or RESEND_FROM_EMAIL is not set.');
    }

    const result = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    throw error;
  }
}






