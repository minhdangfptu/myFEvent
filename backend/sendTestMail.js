import dotenv from 'dotenv';
import { sendMail } from './src/mailer.js';

dotenv.config();

(async () => {
  try {
    await sendMail({
      to: process.env.TEST_EMAIL_TO || 'your.email@example.com',
      subject: 'Test Email via App Password',
      html: '<h3>✅ Gmail SMTP Test Successful!</h3><p>myFEvent is ready to send mail.</p>',
    });
    // Email sent successfully
  } catch (err) {
    console.error('❌ Failed to send:', err);
  }
})();




















