const express = require('express');
const { middleware } = require('@line/bot-sdk');
const { Client } = require('@notionhq/client');

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text;
      console.log("收到訊息:", userText);

      // 簡單的寫入 Notion 邏輯
      try {
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            "Name": { // 請確保您的 Notion 資料庫有這個欄位，或修改為您的實際欄位名稱
              title: [{ text: { content: userText } }]
            }
          }
        });
        console.log("Notion 寫入成功");
      } catch (error) {
        console.error("Notion 寫入失敗:", error);
      }
    }
  }
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在 port ${PORT} 運作中`);
});
