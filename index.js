app.post('/webhook', middleware(config), async (req, res) => {
  console.log("收到 LINE 請求"); // 這行你已經看到了

  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "出貨單號": { title: [{ text: { content: "訂單-001" } }] },
        "出貨日期": { date: { start: "2026-06-11" } },
        "客戶名稱": { rich_text: [{ text: { content: "王小明" } }] }
      }
    });
    console.log("Notion 寫入成功! 回應 ID:", response.id);
  } catch (error) {
    // 這一行是關鍵，如果有錯，它會把 Notion 的詳細錯誤訊息印在 Logs 裡
    console.error("Notion 寫入失敗! 詳細錯誤:", JSON.stringify(error, null, 2));
  }

  res.status(200).send('OK');
});
