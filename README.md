# أموالي — Amwali

منظومة إدارة الأموال العائلية — تطبيق ويب عربي (RTL) لتتبّع المصروفات والمداخيل والديون والتحويلات بين أفراد العائلة.

**Live:** https://totofroto.github.io/amwali/

## البنية | Structure

| File | Purpose |
|---|---|
| `index.html` | الهيكل والواجهة — markup + `<head>` |
| `styles.css` | كل التنسيقات — themes via CSS variables |
| `app.js` | كل المنطق — state, sync, reports, PDF |
| `SYNC.md` | شرح آلية المزامنة (per-record merge) |
| `firebase-rules.json` | قواعد الأمان لقاعدة البيانات |
| `PROJECT_STATE.md` | **ذاكرة المشروع** — ماذا أنجزنا وأين نحن (اقرأه أولاً) |
| `ROADMAP.md` | خارطة الطريق — ماذا سنفعل لاحقاً |

No build step. Static site, served from repo root by GitHub Pages.

## الاعتماديات | Dependencies (CDN)
- Chart.js 4.4.1 — التقارير
- jsPDF 2.5.1 — تصدير PDF

## التخزين | Storage
- `localStorage` (`amwali_v1`) — نسخة الجهاز
- Firebase Realtime Database (REST) — المزامنة بين الأجهزة

## المزامنة | Sync setup
على **كل جهاز**: الإعدادات ← المزامنة ← أدخل **نفس رمز العائلة** ← اضغط تفعيل.
بدون الرمز، البيانات تبقى على هذا الجهاز فقط.

> ⚠️ ابدأ دائماً بالجهاز الذي يحتوي على أحدث البيانات، واضغط "مزامنة الآن" عليه أولاً.

## التطوير | Development
```bash
git clone https://github.com/totofroto/amwali.git
cd amwali
python3 -m http.server 8000   # http://localhost:8000
```

بعد أي تعديل على `styles.css` أو `app.js`، غيّر رقم `?v=` في `index.html` لتجاوز الكاش.
