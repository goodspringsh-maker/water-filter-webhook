// ...前面的程式碼保持不變
      try {
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            // "出貨單號" 是 Title 類型
            "出貨單號": { 
              title: [{ text: { content: "訂單-001" } }] 
            },
            // "出貨日期" 是 Date 類型
            "出貨日期": { 
              date: { start: "2026-06-11" } 
            },
            // "客戶名稱" 是 Text 類型
            "客戶名稱": { 
              rich_text: [{ text: { content: "王小明" } }] 
            }
          }
        });
        console.log("Notion 寫入成功");
      } catch (error) {
        console.error("Notion 寫入失敗:", error);
      }
// ...後面的程式碼保持不變
