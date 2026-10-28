import axios from "axios";

// Moneris Gateway API (direct purchase) — needs only MONERIS_STORE_ID + MONERIS_API_TOKEN.
// Card data passes through this server: never log or store pan / cvd.

const requestUrl = () =>
  process.env.MONERIS_URL ||
  (process.env.MONERIS_ENV === "prod"
    ? "https://www3.moneris.com/gateway2/servlet/MpgRequest"
    : "https://esqa.moneris.com/gateway2/servlet/MpgRequest");

const xmlEscape = (v) =>
  String(v ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

const tag = (xml, name) => {
  const m = String(xml).match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
};

// expiry_mmyy: "MMYY" from the form → Moneris expects "YYMM"
// Returns { approved, order_id, transaction_id, auth_code, amount, message }
export const monerisPurchase = async ({ order_id, cust_id, amount, pan, expiry_mmyy, cvd }) => {
  const expdate = `${String(expiry_mmyy).slice(2, 4)}${String(expiry_mmyy).slice(0, 2)}`;
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<request>` +
    `<store_id>${xmlEscape(process.env.MONERIS_STORE_ID)}</store_id>` +
    `<api_token>${xmlEscape(process.env.MONERIS_API_TOKEN)}</api_token>` +
    `<purchase>` +
    `<order_id>${xmlEscape(order_id)}</order_id>` +
    `<cust_id>${xmlEscape(cust_id)}</cust_id>` +
    `<amount>${Number(amount).toFixed(2)}</amount>` +
    `<pan>${xmlEscape(String(pan).replace(/\D/g, ""))}</pan>` +
    `<expdate>${xmlEscape(expdate)}</expdate>` +
    `<crypt_type>7</crypt_type>` +
    `<cvd_info><cvd_indicator>1</cvd_indicator><cvd_value>${xmlEscape(cvd)}</cvd_value></cvd_info>` +
    `</purchase>` +
    `</request>`;

  const { data } = await axios.post(requestUrl(), xml, {
    headers: { "Content-Type": "application/xml" },
    timeout: 35000,
    responseType: "text",
  });

  const responseCode = tag(data, "ResponseCode");
  const code = parseInt(responseCode, 10);
  // Moneris: ResponseCode 0–49 = approved, 50+ = declined, "null" = not processed
  const approved = tag(data, "Complete") === "true" && !Number.isNaN(code) && code < 50;
  const message = tag(data, "Message").replace(/\s*\*+\s*=?\s*$/, "") || "No response from Moneris";

  return {
    approved,
    order_id: tag(data, "ReceiptId") || order_id,
    transaction_id: tag(data, "TransID"),
    auth_code: tag(data, "AuthCode"),
    amount: tag(data, "TransAmount") || Number(amount).toFixed(2),
    message,
  };
};
