const express = require('express');
const { middleware } = require('@line/bot-sdk');
const { Client } = require('@notionhq/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', middleware(config), async (req, res) => {
  const userText = req.body.events[0].message.text;
  console.log("收到訊息:", userText);

  try {
    // 1. 使用 Gemini 解析文字
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `請將以下文字轉為 JSON 格式 (欄位: 客戶姓名, 日期, 項目名稱, 數量, 單價)。文字: ${userText}`;
    const result = await model.generateContent(prompt);
    const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(jsonStr);
    console.log("AI 解析結果:", data);

    // 2. 寫入 Notion
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "自動-" + Date.now().toString().slice(-4) } }] },
        "出貨日期": { date: { start: data.日期 || new Date().toISOString().split('T')[0] } },
        "客戶名稱": { rich_text: [{ text: { content: data.客戶姓名 || "未知" } }] },
        "品項1-耗材名稱": { rich_text: [{ text: { content: data.項目名稱 || "無" } }] }
      }
    });
    console.log("Notion 自動寫入成功!");
  } catch (error) {
    console.error("AI 解析或寫入失敗:", error);
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`伺服器成功啟動在 port ${PORT}`);
});
