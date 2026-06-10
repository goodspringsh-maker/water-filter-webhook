export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 200;
    return res.end("OK");
  }
  try {
    const body = req.body;
    if (!body.events || body.events.length === 0) {
      res.statusCode = 200;
      return res.end("OK");
    }
    const event = body.events[0];
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const userId = event.source.userId;
      console.log("收到訊息:", userMessage);
      const parsedData = await parseWithGemini(userMessage);
      if (parsedData) {
        const success = await writeToNotion(parsedData);
        if (success) {
          replyToLine(userId, "✅ 淨水器出貨記錄已新增！");
        } else {
          replyToLine(userId, "❌ 記錄失敗，請稍後重試");
        }
      } else {
        replyToLine(userId, "❌ 無法解析訊息，請確認內容正確");
      }
    }
    res.statusCode = 200;
    res.end("OK");
  } catch (error) {
    console.error("處理錯誤:", error);
    res.statusCode = 200;
    res.end("OK");
  }
}
