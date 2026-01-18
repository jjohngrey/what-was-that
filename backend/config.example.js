// Copy this file to config.js and add your real Twilio credentials
module.exports = {
  twilio: {
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Your Twilio Account SID
    authToken: 'your_auth_token_here',             // Your Twilio Auth Token
    phoneNumber: '+1234567890'                      // Your Twilio phone number
  },
  port: process.env.PORT || 3000
};

