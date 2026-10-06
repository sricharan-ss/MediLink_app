import twilio from 'twilio';

const clearDeadLocalProxy = () => {
  const proxyKeys = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
  ];

  for (const key of proxyKeys) {
    if (process.env[key] === 'http://127.0.0.1:9') {
      delete process.env[key];
    }
  }
};

export const sendOtpNum = async ({phoneNumber, otp}) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NODE_ENV, OTP_MOCK } = process.env;

  if (NODE_ENV === 'development' && OTP_MOCK === 'true') {
    console.warn(`[OTP-MOCK] OTP for ${phoneNumber}: ${otp}`);
    return true;
  }

  // If Twilio is not configured, allow a developer-controlled mock in non-production.
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    if (NODE_ENV === 'development') {
      console.warn(`[OTP-MOCK] Twilio not configured. OTP for ${phoneNumber}: ${otp}`);
      return true;
    }
    console.error('Twilio configuration missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER.');
    return false;
  }

  clearDeadLocalProxy();
  const messageClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const message = await messageClient.messages.create({
      body: `Your OTP for MediLink is: ${otp}`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`[OTP-SMS] Sent OTP SMS to ${phoneNumber}. Twilio SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('[OTP-SMS] Error sending OTP via Twilio:', {
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status,
      moreInfo: error?.moreInfo,
    });
    return false;
  }
};
