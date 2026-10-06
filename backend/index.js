require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Set this in your .env file

// ==========================================
// SERVICE 1: Send Interactive Message
// ==========================================
app.post("/api/send-message", async (req, res) => {
  const { to } = req.body;

  if (!to) {
    return res.status(400).json({ error: "Phone number 'to' is required." });
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "You have a new request. Do you accept?"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "accept_request",
              title: "Accept"
            }
          },
          {
            type: "reply",
            reply: {
              id: "decline_request",
              title: "Decline"
            }
          }
        ]
      }
    }
  };

  try {
    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      data: payload
    });

    return res.status(200).json({
      success: true,
      message: "Interactive message sent successfully.",
      data: response.data
    });
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to send message."
    });
  }
});

// ==========================================
// SERVICE 2: Receive Messages (Webhook)
// ==========================================

// 2A: Verify Webhook (Required by Meta)
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK VERIFIED");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// 2B: Receive Messages and Interactions
app.post("/api/webhook", (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const phoneNumber = message.from;

      console.log(`Received message from: ${phoneNumber}`);

      // Check if it's an interactive button reply
      if (message.type === "interactive" && message.interactive) {
        const buttonReply = message.interactive.button_reply;
        
        if (buttonReply) {
          console.log(`User clicked button ID: ${buttonReply.id}, Title: ${buttonReply.title}`);
          
          if (buttonReply.id === "accept_request") {
            console.log("-> User accepted the request.");
            // Handle accept logic here
          } else if (buttonReply.id === "decline_request") {
            console.log("-> User declined the request.");
            // Handle decline logic here
          }
        }
      } else {
        // Handle other message types (text, images, etc.)
        console.log("Received a non-interactive message:", JSON.stringify(message, null, 2));
      }
    }
    
    // Return a '200 OK' response to all requests
    return res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    return res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
