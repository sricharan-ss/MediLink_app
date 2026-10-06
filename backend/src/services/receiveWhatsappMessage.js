/**
 * Pure service function — parses an incoming WhatsApp webhook payload.
 * No Express, no req/res.
 *
 * @param {object} body - Raw webhook body from Meta
 * @returns {{ from: string, buttonId: string, buttonTitle: string, messageId: string } | null}
 */
function parseWhatsappWebhook(body) {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return null;

    const { from, id: messageId, type, interactive } = message;

    if (type !== 'interactive' || !interactive) return null;

    const buttonReply = interactive?.button_reply;
    if (!buttonReply) return null;

    return {
      from,
      buttonId: buttonReply.id,
      buttonTitle: buttonReply.title,
      messageId,
    };
  } catch (err) {
    console.error('[parseWhatsappWebhook] Parse error:', err.message);
    return null;
  }
}

export { parseWhatsappWebhook };
