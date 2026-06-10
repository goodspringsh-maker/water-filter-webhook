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
  console.log("收到 LINE 訊息:", userText);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `請將以下文字轉換為 JSON 格式，必須包含這四個鍵: "客戶姓名", "項目名稱", "數量", "單價"。文字內容: ${userText}`;
    
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    
    console.log("AI 解析結果:", data);

    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "AI-" + Date.now().toString().slice(-4) } }] },
        "客戶名稱": { rich_text: [{ text: { content: data.客戶姓名 || "無" } }] },
        "品項1-耗材名稱": { rich_text: [{ text: { content: data.項目名稱 || "無" } }] },
        "品項1-數量": { number: parseInt(data.數量) || 0 },
        "品項1-單價": { number: parseInt(data.單價) || 0 }
      }
    });
    console.log("Notion 寫入成功!");

  } catch (error) {
    console.error("AI 解析或寫入失敗，使用備份存入:", error);
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "原始-" + Date.now().toString().slice(-4) } }] },
        "客戶名稱": { rich_text: [{ text: { content: userText.slice(0, 50) } }] }
      }
    });
  }
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`伺服器成功啟動在 port ${PORT}`));
