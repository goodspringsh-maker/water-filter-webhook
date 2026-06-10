import express from 'express';
import * as line from '@line/bot-sdk';
import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 指定使用 gemini-2.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', line.middleware(config), async (req, res) => {
  const userText = req.body.events[0].message.text;
  console.log("收到訊息:", userText);

  // 封裝重試邏輯的 AI 呼叫函數
  const callAIWithRetry = async (prompt, retries = 2) => {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (retries > 0 && (error.status === 503 || error.message.includes("503"))) {
        console.log(`伺服器忙碌，等待 2 秒後重試...剩餘次數: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return callAIWithRetry(prompt, retries - 1);
      }
      throw error;
    }
  };

  try {
    const prompt = `請將此訊息解析為 JSON，格式必須為: {"客戶姓名": "...", "項目名稱": "...", "數量": 0, "單價": 0}。文字: ${userText}`;
    const result = await callAIWithRetry(prompt);
    const text = result.response.text();
    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    
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
    console.log("Notion 寫入成功:", data);
  } catch (error) {
    console.error("處理失敗:", error.message);
  }
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`伺服器啟動在 port ${PORT}`));
