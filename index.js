try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `請將以下文字解析為 JSON 格式 {"客戶姓名": "...", "項目名稱": "...", "數量": 0, "單價": 0}。文字: ${userText}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("AI 回傳內容:", text); // 加上這行來檢查 AI 到底回傳了什麼
    
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    
    // ... 後續寫入 Notion 的程式碼保持不變
  } catch (error) {
    console.error("AI 錯誤細節:", error); // 這裡會幫我們抓出是哪一行解析失敗
    // ... 原本的備份寫入區塊
  }
