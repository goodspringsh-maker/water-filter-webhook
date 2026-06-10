export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send("OK");
  }
  
  console.log("✅ 收到 LINE Webhook:", req.body);
  res.status(200).json({ ok: true });
}
