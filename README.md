# 🏆 GoldClay Tracker 1.0

**GoldClay Tracker** คือ Web App สำหรับติดตามราคาสินทรัพย์ทั้งฝั่ง **SET Index** ของไทย และ **Forex** จาก cTrader พร้อมฟีเจอร์ครบครัน:

- 🌗 สลับ Light/Dark Theme ได้
- ⭐ Watchlist จัดเก็บหุ้น/สัญญาที่คุณสนใจ
- 📈 กราฟย้อนหลังด้วย Chart.js
- 📩 ระบบแจ้งเตือนผ่าน Telegram Bot เมื่อราคาถึงเป้าหมาย
- 📱 รองรับการแสดงผลบนมือถือเต็มรูปแบบ (Responsive)

---

## 🚀 วิธีใช้งาน

### 1. เปิดหน้าเว็บ:
- แตกไฟล์ `.zip` แล้วเปิด `index.html` ผ่านเบราว์เซอร์
- หรืออัปโหลดเข้า GitHub Pages / Netlify / Vercel

### 2. ตั้งค่า Telegram แจ้งเตือน:

- สร้าง Bot จาก Telegram `@BotFather`
- หาค่า:
  - `BOT_TOKEN` → รหัสของ Bot
  - `CHAT_ID` → ID หรือชื่อกลุ่ม เช่น `@your_group`
- ใส่ค่าใน `config.js`

```javascript
const BOT_TOKEN = 'your_token_here';
const CHAT_ID = '@your_channel_or_group';


---

หากคุณอยากให้ผมแปลง README.md เป็นเวอร์ชันภาษาอังกฤษ หรือเพิ่มป้าย Badge อย่าง  
`![Version](https://img.shields.io/badge/version-1.0.0-gold)` ก็แจ้งมาได้เลยครับ 😄  
หรือถ้าอยากอัปโหลดเข้าสู่ GitHub repository — ผมพร้อมแนะนำขั้นตอนแบบมือโปรให้อีกครั้งครับ!