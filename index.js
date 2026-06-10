const express = require('express');
const { middleware } = require('@line/bot-sdk');
const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 這是 LINE Webhook 的入口，對應到 LINE 後台設定的 /webhook
app.post('/webhook', middleware(config), (req, res) => {
  console.log("收到 LINE 請求");
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在 port ${PORT} 運作中`);
});
