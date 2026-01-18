const twilio = require('twilio');
const config = require('../config');

// Initialize Twilio client
const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Send SMS via Twilio
 * @param {string} to - Phone number to send to (E.164 format: +1234567890)
 * @param {string} message - SMS message body
 * @returns {Promise<object>} Twilio message response
 */
async function sendSMS(to, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to: to
    });
    
    console.log(`✅ SMS sent successfully to ${to}. SID: ${result.sid}`);
    return { success: true, sid: result.sid, to };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format phone number to E.164 format (+1234567890)
 * @param {string} phone - Phone number in any format
 * @returns {string} E.164 formatted phone number
 */
function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return `+${digits}`; // Assume already has country code
}

module.exports = {
  sendSMS,
  formatPhoneNumber
};

