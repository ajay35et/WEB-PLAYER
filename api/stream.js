// Vercel serverless function — Drive video ko apne server se stream karta hai.
// Isse <video> tag ke liye CORS aur seeking (Range requests) dono sahi kaam karte hain,
// jo seedhe Drive ke download link se possible nahi tha.

const { Readable } = require("node:stream");

module.exports = async function handler(req, res) {
  const id = req.query.id;
  const key = process.env.DRIVE_API_KEY;

  if (!id || !key) {
    res.status(400).end("id ya DRIVE_API_KEY missing hai.");
    return;
  }

  const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`;

  const headers = {};
  if (req.headers.range) headers.range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(driveUrl, { headers });
  } catch (err) {
    res.status(502).end("Drive se video fetch nahi ho paayi.");
    return;
  }

  if (!upstream.ok && upstream.status !== 206) {
    const text = await upstream.text().catch(() => "");
    res.status(upstream.status).end(text || "Drive ne video nahi di.");
    return;
  }

  res.status(upstream.status);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");

  const len = upstream.headers.get("content-length");
  if (len) res.setHeader("Content-Length", len);

  const range = upstream.headers.get("content-range");
  if (range) res.setHeader("Content-Range", range);

  res.setHeader("Cache-Control", "private, max-age=0, no-cache");

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
};
