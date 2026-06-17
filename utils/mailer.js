import axios from "axios";

export const sendMail = async ({ to, cc, subject, html, from, replyTo }) => {
  const payload = {
    from: from || '"CanStar Lights" <notifications@canstarlights.ca>',
    to,
    subject,
    html,
  };
  if (cc) payload.cc = cc;
  if (replyTo) payload.replyTo = replyTo;

  const response = await axios.post(
    "https://mailserver.automationlounge.com/api/v1/messages/send",
    payload,
    {
      headers: {
        "Authorization": `Bearer ${process.env.PROMAILER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(`[MAIL] Sent to=${to} subject="${subject}" messageId=${response.data?.data?.messageId}`);
  return response.data;
};

export const verifyMailer = async () => {
  if (!process.env.PROMAILER_API_KEY) {
    throw new Error("PROMAILER_API_KEY is not set");
  }
  console.log("[MAIL] Promailer API ready ✅");
  return true;
};
