const express = require('express');
const { middleware } = require('@line/bot-sdk');
const { Client } = require('@notionhq/client');

const app = express();

// 確保 notion 物件在最上方宣告，且使用環境變數
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.post('/webhook', middleware(config), async (req, res) => {
  console.log("收到 LINE 請求");
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器成功啟動在 port ${PORT}`);
});
