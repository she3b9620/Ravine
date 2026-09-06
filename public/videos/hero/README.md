# RAVINE Hero source folder

ضع هنا فيديوهات الـHero الخام التي تريد تضمينها داخل مشروع RAVINE.

المسار العام لكل ملف سيكون:

`/videos/hero/<filename>.mp4`

ثم يسجل الملف في `lib/ravine-hero-videos.ts` بهذا الشكل:

```ts
{ source: "local", src: "/videos/hero/<filename>.mp4" }
```

مصادر YouTube الخارجية تظل مدعومة ولا يتم حذفها. لا تضع مفاتيح أو أسرار هنا.

ملاحظة: الملفات الكبيرة جدًا قد تتجاوز حدود GitHub العادية؛ عند الحاجة نستخدم Git LFS بدل تخزينها كملف Git عادي.
