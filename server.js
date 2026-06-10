const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 設定（從環境變數讀取）
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function parseWithGemini(userMessage) {
  const prompt = `你是淨水器出貨系統。
用戶訊息：${userMessage}

提取欄位：
- 客戶名稱（必填，找不到用「未命名」）
- 出貨日期（格式YYYY-MM-DD，必填，找不到用今天日期）
- 品項1（耗材名稱、數量、單價、金額）
- 品項2（耗材名稱、數量、單價、金額）
- 品項3（耗材名稱、數量、單價、金額）
- 備註

輸出格式（只輸出JSON，無markdown）：{"客戶名稱":"","出貨日期":"YYYY-MM-DD","品項1":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"品項2":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"品項3":{"耗材名稱":"","數量":0,"單價":0,"金額":0},"備註":""}`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const text = response.data.candidates[0].content.parts[0].text;
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (error) {
    console.error("Gemini 解析錯誤:", error);
    return null;
  }
}

async function writeToNotion(data) {
  const clean = (val) => (val === null || val === undefined || val === "" ? "" : String(val));

  const properties = {
    "客戶名稱": {
      title: [{
        text: {
          content: clean(data.客戶名稱 || "未命名")
        }
      }]
    },
    "出貨日期": {
      date: {
        start: clean(data.出貨日期)
      }
    }
  };

  // 品項1-3
  for (let i = 1; i <= 3; i++) {
    const itemKey = `品項${i}`;
    if (data[itemKey]) {
      properties[`品項${i}-耗材名稱`] = {
        rich_text: [{
          text: { content: clean(data[itemKey].耗材名稱 || "") }
        }]
      };
      properties[`品項${i}-數量`] = {
        number: data[itemKey].數量 || 0
      };
      properties[`品項${i}-單價`] = {
        number: data[itemKey].單價 || 0
      };
      properties[`品項${i}-金額`] = {
        number: data[itemKey].金額 || 0
      };
    }
  }

  if (data.備註) {
    properties["備註"] = {
      rich_text: [{
        text: { content: clean(data.備註) }
      }]
    };
  }
