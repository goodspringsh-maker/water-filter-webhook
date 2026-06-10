export default async function handler(req, res) {
  // 解析 JSON body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 200;
      return res.end("OK");
    }
  }

  // 只處理根路徑的 POST（Line webhook）
  if (req.method === 'POST' && req.url === '/') {
    console.log("收到 LINE Webhook 請求");
    res.statusCode = 200;
    return res.end("OK");
  }

  res.statusCode = 200;
  res.end("OK");
}
