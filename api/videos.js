// Vercel serverless function — Drive folder me jitne video hain unki list deta hai.
// Environment variables (Vercel dashboard > Settings > Environment Variables):
//   DRIVE_FOLDER_ID  — folder ka ID (folder URL ka aakhri hissa)
//   DRIVE_API_KEY    — Google Cloud console se banayi hui API key (Drive API enabled)
// API key sirf server par rehti hai, browser me expose nahi hoti.

module.exports = async function handler(req, res) {
  const folder = process.env.DRIVE_FOLDER_ID;
  const key = process.env.DRIVE_API_KEY;

  if (!folder || !key) {
    return res.status(200).json({
      videos: [],
      error: "DRIVE_FOLDER_ID ya DRIVE_API_KEY set nahi hai."
    });
  }

  const params = new URLSearchParams({
    q: `'${folder}' in parents and mimeType contains 'video/' and trashed = false`,
    key,
    orderBy: "name_natural",
    pageSize: "200",
    fields: "files(id,name,mimeType,size,thumbnailLink,videoMediaMetadata/durationMillis)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });

  try {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const data = await r.json();

    if (!r.ok) {
      const msg = data?.error?.message || "Drive API se list nahi mili.";
      return res.status(200).json({ videos: [], error: msg });
    }

    const videos = (data.files || []).map((f) => ({
      id: f.id,
      name: f.name.replace(/\.[^.]+$/, ""),
      src: `/api/stream?id=${f.id}`,
      preview: `https://drive.google.com/file/d/${f.id}/preview`,
      thumb: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+$/, "=s320") : null,
      duration: f.videoMediaMetadata?.durationMillis
        ? Number(f.videoMediaMetadata.durationMillis) / 1000
        : null
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ videos });
  } catch (err) {
    return res.status(200).json({ videos: [], error: "Drive se connect nahi ho paaya." });
  }
}
