import {
  sendWhatsappService,
  receiveWhatsappService,
} from './whatsapp.service.js';

/**
 * POST /api/whatsapp/send
 * Sends an interactive WhatsApp message with Accept/Decline buttons.
 */
async function sendWhatsapp(req, res) {
  const { to, bodyText } = req.body;

  if (!to || !bodyText) {
    return res.status(400).json({
      success: false,
      code: 400,
      status: 'BAD_REQUEST',
      message: "Both 'to' (phone number) and 'bodyText' are required.",
    });
  }

  const result = await sendWhatsappService({ to, bodyText });
  return res.status(result.code).json(result);
}

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake.
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('[WhatsApp] Webhook verified by Meta.');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages / button replies from Meta.
 * MUST always return 200 so Meta does not retry.
 */
function receiveWebhook(req, res) {
  receiveWhatsappService(req.body);

  // Always 200 — Meta will keep retrying if we return anything else
  return res.sendStatus(200);
}

export { sendWhatsapp, verifyWebhook, receiveWebhook };
