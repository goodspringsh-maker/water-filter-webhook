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
  
  try {
    // 這次改用 gemini-1.5-flash，這是目前最穩定且免費的版本
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `請將以下文字轉為 JSON (必須包含: 客戶姓名, 項目名稱, 數量, 單價)。若有多個項目，請只取第一個。文字: ${userText}`;
    
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "AI-" + Date.now().toString().slice(-4) } }] },
        "客戶名稱": { rich_text: [{ text: { content: data.客戶姓名 || "無" } }] },
        "品項1-耗材名稱": { rich_text: [{ text: { content: data.項目名稱 || "無" } }] },
        "品項1-數量": { number: Number(data.數量) || 0 },
        "品項1-單價": { number: Number(data.單價) || 0 }
      }
    });
  } catch (error) {
    console.error("AI 解析失敗:", error);
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
app.listen(PORT);
