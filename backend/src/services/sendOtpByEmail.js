import nodemailer from 'nodemailer';

export function sendOtpEmail(email, otp) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'prathamgupta.wk@gmail.com',
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: 'prathamgupta.wk@gmail.com',
    to: email,
    subject: 'Complete Setup -- Verification Code',
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MediLink OTP</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f6f7f9;
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    "
  >
    <!-- wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px">
      <tr>
        <td align="center">
          <!-- card -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 480px;
              background: #ffffff;
              border-radius: 14px;
              padding: 40px 32px;
              box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
            "
          >
            <!-- brand -->
            <tr>
              <td
                style="
                  font-size: 20px;
                  font-weight: 600;
                  color: #111;
                  letter-spacing: 0.3px;
                  padding-bottom: 28px;
                "
              >
                MediLink
              </td>
            </tr>

            <!-- heading -->
            <tr>
              <td
                style="
                  font-size: 18px;
                  font-weight: 600;
                  color: #111;
                  padding-bottom: 12px;
                "
              >
                Verification Code
              </td>
            </tr>

            <!-- text -->
            <tr>
              <td
                style="
                  font-size: 14px;
                  line-height: 22px;
                  color: #555;
                  padding-bottom: 28px;
                "
              >
                Use the code below to complete your setup.
                This code expires in 10 minutes.
              </td>
            </tr>

            <!-- otp box -->
            <tr>
              <td align="center" style="padding-bottom: 32px">
                <div
                  style="
                    display: inline-block;
                    background: #f3f4f6;
                    padding: 16px 28px;
                    border-radius: 10px;
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 6px;
                    color: #111;
                  "
                >
                  ${otp}
                </div>
              </td>
            </tr>

            <!-- help text -->
            <tr>
              <td
                style="
                  font-size: 13px;
                  color: #888;
                  line-height: 20px;
                  padding-bottom: 24px;
                "
              >
                If you didn’t request this, you can safely ignore this email.
                Never share your code with anyone.
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td
                style="
                  font-size: 12px;
                  color: #aaa;
                  border-top: 1px solid #eee;
                  padding-top: 20px;
                "
              >
                © 2026 MediLink · Secure patient management platform
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    }
  });
}
