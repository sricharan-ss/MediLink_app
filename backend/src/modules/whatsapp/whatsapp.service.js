import { sendWhatsappMessage } from '../../services/sendWhatsappMessage.js';
import { parseWhatsappWebhook } from '../../services/receiveWhatsappMessage.js';

/**
 * Business logic for sending a WhatsApp interactive message.
 *
 * @param {{ to: string, bodyText: string }} params
 * @returns {Promise<{ success: boolean, code: number, status: string, message: string }>}
 */
async function sendWhatsappService({ to, bodyText }) {
  const sent = await sendWhatsappMessage({ to, bodyText });

  if (sent) {
    return {
      success: true,
      code: 200,
      status: 'OK',
      message: 'WhatsApp message sent',
    };
  }

  return {
    success: false,
    code: 500,
    status: 'ERROR',
    message: 'Failed to send WhatsApp message',
  };
}

/**
 * Business logic for receiving and parsing a WhatsApp webhook event.
 *
 * @param {object} body - Raw webhook body
 * @returns {{ success: boolean, code: number, status: string, message: string, data?: object }}
 */
function receiveWhatsappService(body) {
  const parsed = parseWhatsappWebhook(body);

  if (!parsed) {
    return {
      success: false,
      code: 400,
      status: 'IGNORED',
      message: 'Not a valid button reply event',
    };
  }

  console.log(
    `[WhatsApp] Button tap from ${parsed.from}: [${parsed.buttonId}] "${parsed.buttonTitle}"`
  );

  return {
    success: true,
    code: 200,
    status: 'OK',
    message: `Received button reply: ${parsed.buttonTitle}`,
    data: parsed,
  };
}

export { sendWhatsappService, receiveWhatsappService };
