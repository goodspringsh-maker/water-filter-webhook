import express from 'express';
import * as line from '@line/bot-sdk';
import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 改回 gemini-1.5-flash，這是目前最穩定且免費的正式模型
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', line.middleware(config), async (req, res) => {
  const userText = req.body.events[0].message.text;
  
  const callAIWithRetry = async (prompt, retries = 3) => {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (retries > 0) {
        // 等待時間從 2 秒加長到 4 秒，避開流量尖峰
        console.log(`伺服器忙碌，4 秒後重試...剩餘次數: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        return callAIWithRetry(prompt, retries - 1);
      }
      throw error;
    }
  };

  try {
    const prompt = `請將此訊息解析為 JSON: {"客戶姓名": "...", "項目名稱": "...", "數量": 0, "單價": 0}。文字: ${userText}`;
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
    console.log("Notion 寫入成功");
  } catch (error) {
    console.error("最終 AI 解析失敗:", error.message);
  }
  res.status(200).send('OK');
});

app.listen(process.env.PORT || 10000);
