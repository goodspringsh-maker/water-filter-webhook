import express from 'express';
import * as line from '@line/bot-sdk';
import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', line.middleware(config), async (req, res) => {
  const userText = req.body.events[0].message.text;
  
  try {
    // 1. 自動偵測可用的模型
    const models = await genAI.listModels();
    console.log("當前帳號可用模型:", models.models.map(m => m.name));
    
    // 2. 取第一個可用的模型 (優先使用支援 generateContent 的)
    const modelName = models.models[0].name;
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // 3. 執行解析
    const result = await model.generateContent(`請將此訊息解析為 JSON: {"客戶姓名": "...", "項目名稱": "...", "數量": 0, "單價": 0}。文字: ${userText}`);
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
    console.log(`成功使用模型 ${modelName} 寫入資料`);
  } catch (error) {
    console.error("解析過程失敗，錯誤細節:", error.message);
  }
  res.status(200).send('OK');
});

app.listen(process.env.PORT || 10000);
