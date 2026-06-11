import express from 'express';
import * as line from '@line/bot-sdk';
import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 簡單的限流變數
let lastRequestTime = 0;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', line.middleware(config), async (req, res) => {
  // 限流機制：若距離上次請求小於 15 秒，直接回覆忙碌中
  if (Date.now() - lastRequestTime < 15000) {
    console.log("請求過快，自動跳過");
    return res.status(200).send('OK'); 
  }
  lastRequestTime = Date.now();

  const userText = req.body.events[0].message.text;

  try {
    const prompt = `請將此訊息解析為 JSON: {"客戶姓名": "...", "項目名稱": "...", "數量": 0, "單價": 0}。文字: ${userText}`;
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    
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
    console.log("AI 成功解析並寫入");
  } catch (error) {
    console.error("處理失敗:", error.message);
  }
  res.status(200).send('OK');
});

app.listen(process.env.PORT || 10000);
