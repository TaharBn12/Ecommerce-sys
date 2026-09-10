# نشر CodFlow على Cloudflare عبر GitHub Actions — بالعربية

هذا الدليل يشرح كيف تربط حساب **Cloudflare** بمستودعك على **GitHub** وتنشر **CodFlow** تلقائياً
(Backend + Dashboard + Storefront) بدون أن تشارك بيانات الدخول مع أي أحد.

---

## ⚠️ قواعد الأمان

- **لا ترسل أبداً** `CLOUDFLARE_API_TOKEN`، أو `BETTER_AUTH_SECRET`، أو `STORE_API_KEY`،
  أو أي سر في المحادثة.
- الأختام (Secrets) تُضاف داخل **GitHub** من واجهة المستخدم فقط.
- `wrangler.toml` و `.env` ملفات **gitignored**، فلا يتم رفعها أو إرسالها للـ Git.

---

## 1) تجهيز حساباتك

- حساب **Cloudflare** + **دومين موجود** في Cloudflare (مثلاً `example.com`).
- حساب **GitHub** + المستودع الحالي (`TaharBn12/Ecommerce-sys`).
- الدومينات الفرعية التي ستستخدمها (يجب إضافتها إلى DNS Cloudflare أو سيضيفها العمل تلقائياً):
  - `api.example.com` → للـ Backend
  - `dashboard.example.com` → للوحة التحكم
  - `shop.example.com` → للمتجر
  - `media.example.com` (اختياري) → لصور المنتجات عبر R2

---

## 2) إنشاء Cloudflare API Token

افتح: **Cloudflare Dashboard → My Profile → API Tokens → Create Token**

استخدم قالب **"Edit Cloudflare Workers"** أو أنشئ Token مخصص بالأذونات التالية:

| الصلاحية | المستوى |
|---|---|
| Account → Cloudflare Workers Scripts | Edit |
| Account → D1 | Edit |
| Account → R2 Storage | Edit |
| Account → Workers KV Storage | Edit |
| Zone → Workers Routes / DNS | Edit (إن أردت إضافة الدومينات تلقائياً) |

بعد الإنشاء، **انسخ** قيمة الـ Token (تظهر مرة واحدة).

أيضاً خذ **Account ID** من:
**Cloudflare Dashboard → أعلى يسار الصفحة → Account ID**

---

## 3) إضافة الأسرار إلى GitHub

من المستودع:

> **Settings → Secrets and variables → Actions → New repository secret**

### 🚀 الطريقة السريعة (سر واحد فقط — بدون دومين)

أضف هذا السر **وحده** وسيهتم الـ Workflow بكل شيء آخر تلقائياً:

| الاسم | القيمة |
|---|---|
| `CLOUDFLARE_API_TOKEN` | التوكن الذي أنشأته في الخطوة 2 |

ما يحدث تلقائياً في هذه الحالة:
- `CLOUDFLARE_ACCOUNT_ID` يُجلب من التوكن.
- النشر يتم على النطاق المجاني `*.workers.dev` (يُسجَّل تلقائياً).
- `BETTER_AUTH_SECRET` و`STORE_API_KEY` و`MCP_LOGIN_TICKET_SECRET` تُشتق
  تلقائياً من التوكن (HMAC-SHA256) وتظل ثابتة بين التشغيلات.
- `ADMIN_EMAIL` = `admin@example.com` افتراضياً.

### 🏢 الطريقة الكاملة (دومين مخصص + كل القيم يدوياً)

أنشئ الأسرار التالية:

#### أسرار مطلوبة

| الاسم | القيمة |
|---|---|
| `CLOUDFLARE_API_TOKEN` | التوكن الذي أنشأته في الخطوة 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID من لوحة Cloudflare |
| `API_DOMAIN` | `api.example.com` |
| `DASHBOARD_DOMAIN` | `dashboard.example.com` |
| `STORE_DOMAIN` | `shop.example.com` |
| `BETTER_AUTH_SECRET` | سر عشوائي، مثلاً: `openssl rand -hex 32` |
| `STORE_API_KEY` | مفتاح المتجر، مثلاً: `openssl rand -hex 24` |
| `MCP_LOGIN_TICKET_SECRET` | سر عشوائي، مثلاً: `openssl rand -hex 32` |
| `ADMIN_EMAIL` | بريد الأدمن، مثل `admin@example.com` |

#### أسرار اختيارية

| الاسم | القيمة |
|---|---|
| `MEDIA_DOMAIN` | `media.example.com` (لتقديم صور R2) |
| `ADMIN_NAME` | اسم الأدمن، افتراضياً `Admin` |
| `D1_DATABASE_ID` | UUID قاعدة D1 (في حال أنشأتها مسبقاً) |
| `RATE_LIMIT_KV_ID` | ID لمساحة `RATE_LIMIT` (إن وجدت مسبقاً) |
| `OAUTH_KV_ID` | ID لمساحة `OAUTH_KV` (إن وجدت مسبقاً) |
| `R2_ACCESS_KEY_ID` | مفتاح R2 Access Key (للرفع عبر أفعال presigned) |
| `R2_SECRET_ACCESS_KEY` | سر R2 Secret Access Key |

---

## 4) الدومينات: اختيارية أو مخصصة

### الوضع الافتراضي — بدون دومين (workers.dev)
إن لم تضع `API_DOMAIN`/`DASHBOARD_DOMAIN`/`STORE_DOMAIN` فسيُنشر النظام على
النطاق المجاني للحساب:

- API: `https://codflow-server.<حسابك>.workers.dev`
- لوحة التحكم: `https://codflow-dashboard.<حسابك>.workers.dev`
- المتجر: `https://codflow-os-theme01.<حسابك>.workers.dev`

> ملاحظة: قد يكون جلب المنتجات داخل المتجر محدوداً لأن Cloudflare تحظر أحياناً
> نداء Worker → Worker بين نطاقات `workers.dev`. اللوحة والـ API يعملان كاملاً.
> عند إضافة دومين لاحقاً، أضف الأسرار الثلاثة للمجالات وأعد تشغيل الـ Workflow.

### دومين مخصص (للإنتاج)
هذا المشروع يعتمد على **Workers**، ويستدعي Worker → Worker. لهذا يجب أن يكون
`cod-server` على **دومين مخصص** وليس `*.workers.dev`.

أسهل طريقة:
- أضف دومينك إلى Cloudflare (Zone).
- Workflow سيستخدم `--route api.example.com` وهكذا لربط الدومينات بالـ Workers تلقائياً.
- إن لم يُضف الـ Zone في Cloudflare، قد يفشل `--route`؛ في هذه الحالة أضف الدومينات
  من **Cloudflare Dashboard → Workers & Pages → Worker → Settings → Domains & Routes**.

---

## 5) تشغيل النشر

1. ارفع هذه الملفات إلى مستودعك (سأرفعها لك على فرع `arena/01a08814-ecommerce-sys`).
2. من GitHub:
   **Actions → Deploy CodFlow to Cloudflare → Run workflow → اختر الفرع → Run**.

أو ادفع إلى فرع `main` فيُشغَّل العمل تلقائياً.

---

## 6) ماذا يفعل الـ Workflow

عند التشغيل سيقوم بـ:

1. تحميل المشروع وتثبيت الاعتماديات.
2. إنشاء/استخدام:
   - D1 database (اسمها `codflow-db`)
   - R2 bucket (اسمه `codflow-images`)
   - KV `RATE_LIMIT`
   - KV `OAUTH_KV`
3. توليد ملفات الإعدادات من الإختام (`wrangler.toml`, `.env`).
4. تنفيذ الـ Migrations على `D1` البعيد.
5. تعبئة بيانات تجريبية (أصناف/منتجات).
6. إنشاء حساب الأدمن و**طباعة كلمة المرور مرة واحدة في الـ Logs**.
7. تعيين الأسرار على الـ Workers.
8. بناء ونشر الخوادم الثلاثة مع ربط الدومينات.

---

## 7) بعد النشر

احفظ من سجل خطوة **Seed merchant admin account**:

```
Email    : <admin email>
Password : ************   ← انسخها قبل إغلاق السجل
API Key  : cod_********
```

روابطك النهائية (تظهر في زر **Summary**):

- API: `https://api.example.com/api/docs`
- لوحة التحكم: `https://dashboard.example.com`
- المتجر: `https://shop.example.com`

---

## 8) رفع الصور (R2) — اختياري

لتفعيل رفع صور المنتجات:

1. أنشئ **R2 API Token** (Object Read & Write) من Cloudflare.
2. أضف في GitHub الأسرار:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `MEDIA_DOMAIN=media.example.com`
3. أضف دومين `media.example.com` إلى **R2 → Bucket → Settings → Custom Domains**.
4. أضف سياسة CORS تسمح بـ `PUT` من `https://dashboard.example.com`.
5. أعد تشغيل الـ Workflow.

---

## 9) مشاكل شائعة

| المشكلة | الحل |
|---|---|
| فشل إنشاء التوكن بسجل `Invalid OAuth` | تأكد أن المستخدم يملك إقامة الدومين في Cloudflare |
| `--route` يفشل | أضف الدومين إلى Cloudflare Zone / DNS ثم أعد التشغيل |
| تسجيل الدخول 403 `INVALID_ORIGIN` | تأكد أن `DASHBOARD_DOMAIN` مضبوط والـ secret مضبوط في GitHub، وأعد النشر |
| خطأ 500 عند تسجيل الدخول | تأكد أن خطوة **Apply remote migrations** نجحت (بدونها Better Auth يفشل) |
| روابط `workers.dev` | هذا مقصود — نستخدم دومينات مخصصة. لا تعتمد على `*.workers.dev` |
| كلمة مرور الأدمن | تظهر فقط في Logs خطوة Seed admin. لو فاتتك، شغّل Again وسيُعاد إنشاؤها. |
