const express = require('express');
const { middleware } = require('@line/bot-sdk');
const { Client } = require('@notionhq/client');

const app = express();

// 這裡就是定義 notion 變數的地方，如果漏掉這行就會報錯
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

      try {
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            "出貨單號": { title: [{ text: { content: "訂單-001" } }] },
            "出貨日期": { date: { start: "2026-06-11" } },
            "客戶名稱": { rich_text: [{ text: { content: "王小明" } }] }
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
