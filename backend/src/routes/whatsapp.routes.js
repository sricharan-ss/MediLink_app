import express from 'express';
import {
	sendWhatsapp,
	verifyWebhook,
	receiveWebhook,
} from '../modules/whatsapp/whatsapp.controller.js';

const router = express.Router();

// POST /api/whatsapp/send — trigger a WhatsApp message to a phone number
router.post('/send', sendWhatsapp);

// GET  /api/whatsapp/webhook — Meta webhook verification
router.get('/webhook', verifyWebhook);

// POST /api/whatsapp/webhook — incoming button replies from WhatsApp
router.post('/webhook', receiveWebhook);

export default router;
