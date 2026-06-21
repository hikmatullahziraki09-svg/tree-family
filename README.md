# شجره‌نامه خانواده

یک اپ ساده برای ساخت درخت خانوادگی که بین اعضای خانواده به اشتراک گذاشته می‌شود و به‌صورت زنده (real-time) به‌روزرسانی می‌شود.

## مراحل راه‌اندازی (قدم به قدم)

### مرحله ۱ — ساخت پروژه‌ی Firebase

1. برو به https://console.firebase.google.com
2. با حساب گوگلت وارد شو
3. روی **Add project** (یا «افزودن پروژه») بزن
4. یک اسم بده (مثلاً `family-tree`) و Continue بزن
5. Google Analytics را می‌تونی خاموش کنی (لازم نیست) — Create project بزن
6. صبر کن تا پروژه ساخته بشه، بعد Continue

### مرحله ۲ — ساخت دیتابیس Firestore

1. در منوی سمت چپ، روی **Build → Firestore Database** بزن
2. روی **Create database** بزن
3. یک location انتخاب کن (هر کدام نزدیک‌تر به خودتان، فرقی در عملکرد ندارد) — Next
4. حالت را روی **Start in test mode** بگذار (موقتاً، چون رمز ورود را در خود اپ کنترل می‌کنیم) — Create

> ⚠️ نکته امنیتی: حالت "test mode" یعنی هرکسی که آدرس دیتابیس را بداند می‌تواند بدون محدودیت بخواند/بنویسد. این برای یک اپ خانوادگی کوچک معمولاً قابل قبول است، اما اگر می‌خواهی محکم‌تر باشد، بعداً در بخش **Rules** می‌توانی قوانین دسترسی را سفت‌تر کنی.

### مرحله ۳ — گرفتن تنظیمات Firebase

1. در صفحه‌ی اصلی پروژه (روی آیکون چرخ‌دنده بالا سمت چپ → **Project settings**)
2. پایین بیا تا به بخش **Your apps** برسی
3. روی آیکون **</>** (Web) بزن
4. یک nickname بده (مثلاً `family-tree-web`) — **Register app**
5. یک تکه کد می‌بینی شبیه این:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "family-tree-xxxx.firebaseapp.com",
     projectId: "family-tree-xxxx",
     storageBucket: "family-tree-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
6. این مقادیر را کپی کن — در مرحله بعد لازمشان داریم

### مرحله ۴ — وارد کردن تنظیمات در پروژه

فایل `src/firebase.js` را باز کن و مقادیر `PASTE_YOUR_..._HERE` را با مقادیر واقعی خودت جایگزین کن.

همچنین در همین فایل، مقدار `FAMILY_PASSCODE` را به رمزی که می‌خواهی بین خانواده رد و بدل شود تغییر بده:
```js
export const FAMILY_PASSCODE = "رمز-دلخواه-شما";
```

### مرحله ۵ — بالا بردن کد روی GitHub

1. یک ریپازیتوری جدید در GitHub بساز به اسم دقیق `tree-family`
2. (نیازی به تغییر `vite.config.js` نیست، از قبل با این اسم تنظیم شده)
3. این پوشه را در ریپازیتوری push کن:
   ```bash
   git init
   git add .
   git commit -m "اولین نسخه"
   git branch -M main
   git remote add origin https://github.com/USERNAME/tree-family.git
   git push -u origin main
   ```

### مرحله ۶ — فعال‌سازی GitHub Pages

1. در ریپازیتوری روی GitHub برو به **Settings → Pages**
2. زیر **Build and deployment**، گزینه‌ی **Source** را روی **GitHub Actions** بگذار
3. چون فایل `.github/workflows/deploy.yml` در پروژه هست، با هر بار push به شاخه‌ی `main`، سایت خودکار build و منتشر می‌شود
4. بعد از چند دقیقه، سایتت در آدرسی شبیه این در دسترس خواهد بود:
   ```
   https://USERNAME.github.io/tree-family/
   ```

### مرحله ۷ — استفاده

لینک را برای اعضای خانواده بفرست. هرکس رمزی که در مرحله‌ی ۴ گذاشتی را وارد می‌کند و می‌تواند درخت را ببیند و عضو اضافه کند. هر تغییری فوراً برای همه نمایش داده می‌شود.

## توسعه‌ی محلی (اختیاری)

```bash
npm install
npm run dev
```
