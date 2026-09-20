# My Drive Videos

Ek chhoti si website jo aapke Google Drive folder ke videos ko apne custom player me chalati hai —
play, pause, speed, next, seek, volume, fullscreen, search aur "jahan chhoda tha wahin se" resume ke saath.
Vercel par seedha deploy ho jaati hai, koi build step nahi.

## Files

```
index.html      player ka page
style.css       styling
app.js          player ki saari logic
api/videos.js   Vercel function — Drive folder ki video list
videos.json     API key na use karni ho to manual list
```

## Step 1 — Drive folder taiyaar karein

1. Drive me ek folder banayein, usme apne videos upload karein.
2. Folder par right click > **Share** > General access = **Anyone with the link** (Viewer).
3. Folder ka URL kuch aisa dikhega:
   `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp` — aakhri hissa (`1AbCdEfGhIjKlMnOp`) hi aapka **folder ID** hai.

## Step 2 — API key banayein

1. [console.cloud.google.com](https://console.cloud.google.com) par ek project banayein.
2. **APIs & Services > Library** me jaakar **Google Drive API** enable karein.
3. **Credentials > Create credentials > API key**.
4. Key par **Restrict key** dabaayein: Application restrictions me *Websites* chunein aur apna Vercel domain daalein, API restrictions me sirf *Google Drive API* rakhein.

## Step 3 — Vercel par deploy

1. In files ko ek GitHub repo me daalein (ya Vercel CLI se `vercel` chala dein).
2. Vercel me project import karein. Framework preset: **Other**. Build command khaali chhod dein.
3. **Settings > Environment Variables** me do cheezein daalein:
   - `DRIVE_FOLDER_ID` = aapka folder ID
   - `DRIVE_API_KEY` = aapki API key
4. Deploy. Ab jo bhi naya video us Drive folder me upload karenge, website par apne aap aa jaayega — code dobara chhune ki zarurat nahi.

## API key ke bina chalana ho to

`videos.json` kholein aur har video ki file ID + naam daal dein
(file ID: video ke share link `https://drive.google.com/file/d/FILE_ID/view` ka beech wala hissa).
Site pehle `/api/videos` try karti hai, na mile to `videos.json` use kar leti hai.

## Keyboard shortcuts

| Key | Kaam |
|---|---|
| Space / K | play, pause |
| ← → | 10 second peeche, aage |
| ↑ ↓ | volume |
| N / P | agla, pichla video |
| [ ] | speed kam, zyada |
| M | mute |
| F | fullscreen |

## Dhyan rakhne ki baatein

- Drive koi normal video host nahi hai. 1–2 GB tak ki files aam taur par theek chalti hain; bahut badi file par direct stream fail ho sakti hai — us waqt player khud "Drive ke player se chalayein" ka button dikha dega, jo Drive ka apna embed player khol deta hai.
- Drive par roz ka download/bandwidth limit hota hai. Agar bahut saare log ek saath dekhenge to video temporarily block ho sakti hai. Agar aage jaakar traffic badhe, to Cloudflare R2, Bunny Stream ya Mux jaise proper video host par shift karna behtar rahega.
- Videos "Anyone with the link" par hain, matlab link jiske paas hai wo dekh sakta hai. Private content ke liye ye setup theek nahi hai.
