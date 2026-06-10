const axios = require('axios');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function parseWithGemini(userMessage) {
  const prompt = `你是淨水器出貨系統。用戶訊息：${userMessage}\n提取欄位：\n- 客戶名稱（必填，找不到用「未命名」）\n- 出貨日期（格式YYYY-MM-DD，必填，找不到用今天日期）\n- 品項1（耗材名稱、數量、單價、金額）\n- 品項2（耗材名稱、數量、單價、金額）\n- 品項3（耗材名稱、數量、單價、金額）\n- 備註\n輸出格式（只輸出JSON，無markdown）：{"客戶名稱":"","出貨日期":"YYYY-MM-DD","品項1":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"品項2":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"品項3":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"備註":""}`;
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  try {
    const response = await axios.post(url, {contents: [{parts: [{text: prompt}]}]});
    const text = response.data.candidates[0].content.parts[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  } catch (error) {
    console.error("Gemini 解析錯誤:", error);
    return null;
  }
}

async function writeToNotion(data) {
  const clean = (val) => (val === null || val === undefined || val === "" ? "" : String(val));
  const properties = {
    "客戶名稱": {title: [{text: {content: clean(data.客戶名稱 || "未命名")}}]},
    "出貨日期": {date: {start: clean(data.出貨日期)}}
  };
  for (let i = 1; i <= 3; i++) {
    const itemKey = `品項${i}`;
    if (data[itemKey]) {
      properties[`品項${i}-耗材名稱`] = {rich_text: [{text: {content: clean(data[itemKey].耗材名稱 || "")}}]};
      properties[`品項${i}-數量`] = {number: data[itemKey].數量 || 0};
      properties[`品項${i}-單價`] = {number: data[itemKey].單價 || 0};
      properties[`品項${i}-金額`] = {number: data[itemKey].金額 || 0};
    }
  }
  if (data.備註) {
    properties["備註"] = {rich_text: [{text: {content: clean(data.備註)}}]};
  }
  try {
    const response = await axios.post("https://api.notion.com/v1/pages", {parent: {database_id: NOTION_DATABASE_ID}, properties}, {headers: {"Authorization": `Bearer ${NOTION_TOKEN}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json"}});
    console.log("✅ 成功寫入 Notion");
    return true;
  } catch (error) {
    console.error("❌ Notion 寫入失敗:", error.response?.data || error.message);
    return false;
  }
}

function replyToLine(userId, message) {
  axios.post("https://api.line.biz/v2/bot/message/push", {to: userId, messages: [{type: "text", text: message}]}, {headers: {"Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "application/json"}}).catch(err => console.error("LINE 回覆錯誤:", err.message));
}

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 200;
      return res.end("OK");
    }
  }

  if (req.method !== 'POST') {
    res.statusCode = 200;
    return res.end("OK");
  }
  
  try {
    if (!body || !body.events || body.events.length === 0) {
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
