# Admin Notification UI — Build Brief (Web)

## এক লাইনে
Platform admin একটা বার্তা লিখে নির্দিষ্ট audience-এ পাঠাবে; সেই বার্তা ঐ ইউজারদের notification center-এ (ঘণ্টা আইকন) দেখাবে। **ব্যাকএন্ড পুরোপুরি তৈরি — শুধু ওয়েবে UI নেই।** এই কাজটা শুধু ৩টা API-এর ওপর একটা admin স্ক্রিন।

কোনো নতুন realtime/websocket/push লাগবে না — সব request/response, notification center আগে থেকেই poll করে দেখায়।

---

## কোথায় বসবে
- শুধু **platform admin** দেখবে — যাদের `company_id ∈ config('subscription.platform_company_ids')` (ডিফল্ট `[1]`)। বাকিরা 403 পাবে।
- Admin সেকশনে একটা নতুন মেনু: **"Admin Notifications"** (composer + list একই পেজে, নিচে দেখুন)।

---

## API চুক্তি (ইতিমধ্যে লাইভ)

সব route auth-এর ভেতরে, prefix `admin/notifications`, middleware `platform.admin`। Response সব `foundData` envelope — অর্থাৎ `axios.data.data.data`-তে payload (notification center যেভাবে পড়ে, ঠিক তেমন)।

### 1) তালিকা — `GET admin/notifications`
সর্বশেষ ২০০টা broadcast, প্রতিটার সাথে কতজন পড়েছে।
```
data.data.data.notifications: [
  { id, title, message, tone, audience_type,
    company_id, branch_id, role_id, user_id,
    starts_at, expires_at, created_at, read_count }
]
```

### 2) পাঠানো — `POST admin/notifications`
```
body: {
  title:         string  (required, max 200)
  message:       string  (required)
  tone:          "info" | "warning" | "danger" | "success"   (optional, default info)
  audience_type: "global" | "company" | "branch" | "role" | "user"  (required)
  company_id:    int   // audience_type === "company" হলে required
  branch_id:     int   // audience_type === "branch"  হলে required
  role_id:       int   // audience_type === "role"    হলে required
  user_id:       int   // audience_type === "user"    হলে required
  expires_at:    date  (optional; null = কখনো expire করবে না)
}
success (201): data.data.data.id + message "Notification sent successfully."
error   (422): { success:false, message:"A branch_id is required for the 'branch' audience." }
```
সার্ভার শুধু প্রাসঙ্গিক target কলামটাই রাখে, বাকিগুলো null করে দেয় — client-এ আলাদা করে null পাঠানোর দরকার নেই, কিন্তু ভুল টার্গেট থাকলেও ক্ষতি নেই।

### 3) মুছে ফেলা — `DELETE admin/notifications/{id}`
Broadcast + তার সব read row মুছে দেয়।
```
success: message "Notification deleted successfully."
404:     "Notification not found"
```

`apiRoutes.tsx`-এ যোগ করার URL:
```ts
export const API_ADMIN_NOTIFICATIONS_URL = `${API_BASE_URL}/admin/notifications`;
```

---

## যে স্ক্রিনটা বানাতে হবে

একটা পেজ, দুই অংশ:

### A. Compose ফর্ম (উপরে)
মাঠগুলো, উপরের validation হুবহু মিরর করে:
- **Title** — text, required, max 200
- **Message** — textarea, required
- **Tone** — select: Info / Warning / Danger / Success (ডিফল্ট Info)। প্রিভিউতে notification center-এর মতো accent রং দেখালে ভালো (info=blue, warning=amber, danger=red, success=green)
- **Audience** — select: Global / Company / Branch / Role / User
  - **conditional field:** audience অনুযায়ী একটা extra picker দেখাও —
    - Company → company dropdown → `company_id`
    - Branch → branch dropdown (`getDdlProtectedBranch` যেটা অন্য পেজে ব্যবহার হয়) → `branch_id`
    - Role → role dropdown → `role_id`
    - User → user dropdown → `user_id`
    - Global → কোনো extra field নেই
  - Submit-এর আগে client-side চেক: audience global না হলে সংশ্লিষ্ট id দিতেই হবে (নইলে সার্ভার 422 দেবে — সেই মেসেজ toast-এ দেখাও)
- **Expires at** — date/datetime picker, optional
- **Send** বাটন → POST → সফল হলে toast + ফর্ম রিসেট + নিচের list রিফ্রেশ

### B. Sent list (নিচে)
`GET`-এর তালিকা টেবিল/কার্ডে:
- Columns: Title • Tone (রঙিন pill) • Audience (audience_type + target-এর নাম, শুধু id নয় হলে ভালো) • Read count • Created • Expires • Delete
- **Delete** → confirm → DELETE → row সরাও

---

## Acceptance criteria
1. Non-platform-admin পেজটা/মেনু দেখবে না (বা খুললে 403 হ্যান্ডল হবে)।
2. Global broadcast পাঠালে সব ইউজারের notification center-এ আসবে; Branch/Company/Role/User টার্গেট করলে শুধু তারাই পাবে।
3. audience global ছাড়া অন্য কিছু, কিন্তু target না দিলে — সার্ভারের 422 মেসেজ ব্যবহারকারীকে দেখানো হবে।
4. পাঠানোর পর list-এ নতুন row আসবে, read_count শুরুতে 0।
5. Delete করলে list থেকে যাবে এবং টার্গেট ইউজারদের notification center থেকেও পরের রিফ্রেশে চলে যাবে।

---

## রেফারেন্স
- Backend controller: `app/Http/Controllers/AdminNotificationController.php`
- Routes: `routes/api.php` → `Route::prefix('admin/notifications')->middleware('platform.admin')`
- Tables: `database/migrations/2026_07_21_120000_create_admin_notification_tables.php`
- Notification center (এগুলো এখানেই দেখায়, ইতিমধ্যে আছে): `src/components/Header/DropdownNotification.tsx`
