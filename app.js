/* My Drive Videos — custom player over public Google Drive files */

const $ = (id) => document.getElementById(id);

const video    = $("player");
const frame    = $("fallback");
const overlay  = $("overlay");
const spinner  = $("spinner");
const listEl   = $("list");

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

let videos  = [];   // full list
let shown   = [];   // after search filter
let index   = -1;   // current index inside `videos`

/* ---------------- data ---------------- */

async function load() {
  let data = null;

  try {
    const r = await fetch("/api/videos");
    if (r.ok) data = await r.json();
  } catch (_) { /* local dev ya api missing */ }

  if (!data || !Array.isArray(data.videos) || !data.videos.length) {
    try {
      const r = await fetch("./videos.json");
      if (r.ok) data = await r.json();
    } catch (_) { /* ignore */ }
  }

  videos = (data && data.videos) ? data.videos : [];

  if (!videos.length) {
    $("count").textContent = "0 videos";
    $("overlayTitle").textContent = "Abhi koi video nahi mila";
    $("overlayNote").textContent =
      "Drive folder ko 'Anyone with the link' karein, folder ID aur API key Vercel ke environment variables me daalein — ya videos.json me file IDs likh dein.";
    return;
  }

  $("count").textContent = videos.length + (videos.length === 1 ? " video" : " videos");
  render(videos);

  const last = Number(localStorage.getItem("lastIndex"));
  if (Number.isInteger(last) && videos[last]) select(last, false);
}

function render(items) {
  shown = items;
  listEl.innerHTML = "";

  items.forEach((v) => {
    const i = videos.indexOf(v);
    const li = document.createElement("li");
    const b  = document.createElement("button");
    b.className = "item" + (i === index ? " active" : "");
    b.dataset.i = i;

    const thumb = document.createElement("span");
    thumb.className = "item-thumb";
    if (v.thumb) {
      thumb.style.backgroundImage = `url("${v.thumb}")`;
    } else {
      thumb.textContent = String(i + 1);
    }

    const box  = document.createElement("span");
    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = v.name;
    box.appendChild(name);

    if (v.duration) {
      const meta = document.createElement("p");
      meta.className = "item-meta";
      meta.textContent = fmt(v.duration);
      box.appendChild(meta);
    }

    b.append(thumb, box);
    b.addEventListener("click", () => select(i, true));
    li.appendChild(b);
    listEl.appendChild(li);
  });
}

/* ---------------- selection ---------------- */

function select(i, autoplay) {
  if (!videos[i]) return;
  index = i;
  const v = videos[i];

  localStorage.setItem("lastIndex", String(i));

  frame.classList.add("hidden");
  frame.removeAttribute("src");
  video.classList.remove("hidden");

  overlay.classList.add("hidden");
  $("useDrive").classList.add("hidden");
  spinner.classList.remove("hidden");

  video.src = v.src;
  video.playbackRate = Number(localStorage.getItem("speed") || 1);

  const saved = Number(localStorage.getItem("t:" + v.id));
  video.addEventListener("loadedmetadata", function once() {
    video.removeEventListener("loadedmetadata", once);
    if (saved > 5 && saved < video.duration - 10) video.currentTime = saved;
    if (autoplay) video.play().catch(() => {});
  });

  $("title").textContent = v.name;
  document.title = v.name;

  [...listEl.querySelectorAll(".item")].forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.i) === i)
  );
}

function step(dir) {
  if (!videos.length) return;
  select((index + dir + videos.length) % videos.length, true);
}

/* ---------------- fallback to Drive's own player ---------------- */

video.addEventListener("error", () => {
  spinner.classList.add("hidden");
  overlay.classList.remove("hidden");
  $("overlayTitle").textContent = "Ye video seedha stream nahi ho paayi";
  $("overlayNote").textContent =
    "File bahut badi ho sakti hai ya sharing 'Anyone with the link' par nahi hai. Drive ke apne player se try karein.";
  $("useDrive").classList.remove("hidden");
});

$("useDrive").addEventListener("click", () => {
  const v = videos[index];
  if (!v) return;
  video.pause();
  video.classList.add("hidden");
  overlay.classList.add("hidden");
  frame.src = v.preview;
  frame.classList.remove("hidden");
});

/* ---------------- controls ---------------- */

$("play").addEventListener("click", toggle);
video.addEventListener("click", toggle);

function toggle() {
  if (index < 0) return;
  video.paused ? video.play().catch(() => {}) : video.pause();
}

video.addEventListener("play", () => {
  $("iconPlay").classList.add("hidden");
  $("iconPause").classList.remove("hidden");
  $("play").setAttribute("aria-label", "Pause");
});

video.addEventListener("pause", () => {
  $("iconPause").classList.add("hidden");
  $("iconPlay").classList.remove("hidden");
  $("play").setAttribute("aria-label", "Play");
});

video.addEventListener("waiting", () => spinner.classList.remove("hidden"));
video.addEventListener("playing", () => spinner.classList.add("hidden"));
video.addEventListener("canplay",  () => spinner.classList.add("hidden"));

$("prev").addEventListener("click", () => step(-1));
$("next").addEventListener("click", () => step(1));

video.addEventListener("ended", () => {
  if ($("autonext").checked) step(1);
});

/* progress */

video.addEventListener("timeupdate", () => {
  const d = video.duration || 0;
  const p = d ? (video.currentTime / d) * 100 : 0;
  $("barPlayed").style.width = p + "%";
  $("barKnob").style.left = `calc(4px + ${p}% - ${(p / 100) * 8}px)`;
  $("cur").textContent = fmt(video.currentTime);

  if (videos[index] && video.currentTime > 5) {
    localStorage.setItem("t:" + videos[index].id, String(Math.floor(video.currentTime)));
  }
});

video.addEventListener("progress", () => {
  if (video.buffered.length && video.duration) {
    const end = video.buffered.end(video.buffered.length - 1);
    $("barBuffer").style.width = (end / video.duration) * 100 + "%";
  }
});

video.addEventListener("loadedmetadata", () => {
  $("dur").textContent = fmt(video.duration);
});

const bar = $("bar");
let scrubbing = false;

function seekAt(e) {
  const r = bar.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - r.left - 4, 0), r.width - 8);
  if (video.duration) video.currentTime = (x / (r.width - 8)) * video.duration;
}

bar.addEventListener("pointerdown", (e) => { scrubbing = true; bar.setPointerCapture(e.pointerId); seekAt(e); });
bar.addEventListener("pointermove", (e) => { if (scrubbing) seekAt(e); });
bar.addEventListener("pointerup",   () => { scrubbing = false; });

/* speed */

const speedMenu = $("speedMenu");

SPEEDS.forEach((s) => {
  const b = document.createElement("button");
  b.textContent = s + "×";
  b.dataset.s = s;
  b.addEventListener("click", () => { setSpeed(s); speedMenu.classList.add("hidden"); });
  speedMenu.appendChild(b);
});

$("speedBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  speedMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => speedMenu.classList.add("hidden"));

function setSpeed(s) {
  video.playbackRate = s;
  localStorage.setItem("speed", String(s));
  $("speedBtn").textContent = s + "×";
  [...speedMenu.children].forEach((b) => b.classList.toggle("on", Number(b.dataset.s) === s));
}

function bumpSpeed(dir) {
  const i = SPEEDS.indexOf(video.playbackRate);
  const n = Math.min(Math.max((i < 0 ? 2 : i) + dir, 0), SPEEDS.length - 1);
  setSpeed(SPEEDS[n]);
}

setSpeed(Number(localStorage.getItem("speed") || 1));

/* volume */

$("vol").addEventListener("input", (e) => {
  video.volume = Number(e.target.value);
  video.muted = video.volume === 0;
  paintVolume();
});

$("mute").addEventListener("click", () => {
  video.muted = !video.muted;
  paintVolume();
});

function paintVolume() {
  const off = video.muted || video.volume === 0;
  $("iconVol").classList.toggle("hidden", off);
  $("iconMute").classList.toggle("hidden", !off);
  $("vol").value = video.muted ? 0 : video.volume;
}

/* fullscreen */

$("full").addEventListener("click", () => {
  const box = $("screen");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (box.requestFullscreen) box.requestFullscreen();
  else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
});

/* search */

$("search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  render(q ? videos.filter((v) => v.name.toLowerCase().includes(q)) : videos);
});

/* keyboard */

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  const k = e.key.toLowerCase();

  if (e.code === "Space" || k === "k") { e.preventDefault(); toggle(); }
  else if (k === "arrowright") video.currentTime += 10;
  else if (k === "arrowleft")  video.currentTime -= 10;
  else if (k === "arrowup")   { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); paintVolume(); }
  else if (k === "arrowdown") { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); paintVolume(); }
  else if (k === "n") step(1);
  else if (k === "p") step(-1);
  else if (k === "m") { video.muted = !video.muted; paintVolume(); }
  else if (k === "f") $("full").click();
  else if (k === "]") bumpSpeed(1);
  else if (k === "[") bumpSpeed(-1);
});

/* helpers */

function fmt(sec) {
  if (!isFinite(sec)) return "0:00";
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

load();
