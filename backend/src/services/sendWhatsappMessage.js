import axios from 'axios';

/**
 * Pure service function — sends an interactive WhatsApp button message.
 * No Express, no req/res. Returns true on success, false on failure.
 *
 * @param {{ to: string, bodyText: string }} params
 * @returns {Promise<boolean>}
 */
async function sendWhatsappMessage({ to, bodyText }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText || 'You have a new request. Do you accept?',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'ACCEPT',
              title: 'Accept',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'DECLINE',
              title: 'Decline',
            },
          },
        ],
      },
    },
  };

  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });
    return true;
  } catch (error) {
    console.error(
      '[sendWhatsappMessage] Error:',
      error.response?.data || error.message
    );
    return false;
  }
}

export { sendWhatsappMessage };
