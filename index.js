const express = require('express');
const { middleware } = require('@line/bot-sdk');
const { Client } = require('@notionhq/client');

// 1. 先宣告 app (解決 ReferenceError)
const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 2. 現在才可以使用 app
app.post('/webhook', middleware(config), async (req, res) => {
  console.log("收到 LINE 請求");
  
  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "訂單-001" } }] },
        "出貨日期": { date: { start: "2026-06-11" } },
        "客戶名稱": { rich_text: [{ text: { content: "王小明" } }] }
      }
    });
    console.log("Notion 寫入成功!");
  } catch (error) {
    console.error("Notion 寫入失敗!", error);
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器成功啟動在 port ${PORT}`);
});
