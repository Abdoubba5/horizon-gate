# 🌅 بوابة الأفق | Horizon Gate

**منصة إلكترونية مفتوحة المصدر لإدارة ونشر الفرص العالمية**
Abdelilah Sidiali © 2026

---

## 📁 هيكل المشروع

```
horizon-gate/
├── index.html              ← الصفحة العامة للمستخدمين
├── admin-dashboard.html    ← لوحة التحكم (محمية بكلمة مرور)
├── manifest.json           ← PWA manifest
├── css/
│   └── style.css           ← نظام التصميم البصري الكامل
└── js/
    ├── horizon-db.js       ← محرك قاعدة البيانات المحلية
    └── app-advanced.js     ← محرك المزامنة الفورية
```

---

## ⚙️ التشغيل

### محلياً:
```bash
# أي خادم HTTP بسيط يكفي:
npx serve .
# أو:
python3 -m http.server 8080
```

### على GitHub Pages / Netlify / Vercel:
ارفع المجلد مباشرةً، لا يلزم أي إعداد خاص.

---

## 🔐 لوحة التحكم

- الرابط: `/admin-dashboard.html`
- كلمة المرور الافتراضية: **1234**
- لتغيير الكلمة: في `admin-dashboard.html`، غيّر قيمة `MASTER_PASSCODE`

---

## ✨ المميزات

| الميزة | التفاصيل |
|--------|----------|
| قاعدة البيانات | `localStorage` — لا خادم مطلوب |
| المزامنة الفورية | `BroadcastChannel` بين التبويبات |
| تصدير / استيراد | JSON مع BOM عربي |
| البحث والفلترة | فوري بدون إعادة تحميل |
| الأمان | حجب DevTools + F12 + Right-Click |
| التصميم | Glassmorphism داكن، خطوط Cairo/Tajawal |
| الاستجابة | متوافق مع الجوال والتابلت |

---

## 📊 نموذج البيانات

```json
{
  "id": "hzn_1717000000000_abc1234",
  "title": "منحة الجامعة الأوروبية 2026",
  "url": "https://example.com/apply",
  "type": "منحة دراسية",
  "funding": "ممولة بالكامل",
  "country": "ألمانيا",
  "deadline": "2026-09-30",
  "desc": "وصف تفصيلي بالعربية...",
  "createdAt": "2026-06-04T12:00:00.000Z"
}
```

---

## 📦 المكتبات المستخدمة

لا يوجد — **Vanilla HTML5 + CSS3 + ES6+ فقط** 🎯

---

*Built with ❤️ for the Algerian & Arabic-speaking community*

