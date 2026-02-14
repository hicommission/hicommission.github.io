/* ============================================================
   music-portfolio/js/app.js
   Tabbed multi-artist catalog with:
   - Clickable thumbnails (toggle preview)
   - 30s preview w/ placeholder waveform + timer
   - Buy button -> POST create -> redirect to PayPal
   - Artist3 hero video (13s loop segment)
   ============================================================ */

/** =========================
 *  CONFIG
 *  ========================= */
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

const PREVIEW_SECONDS = 30;
const PREVIEW_BASE = "assets/previews"; // relative to /music-portfolio/

/** =========================
 *  CATALOG (EDIT THIS)
 *  ========================= */
const CATALOG = [
  {
    id: "blakats",
    label: "BlaKats",
    themeClass: "theme-blakats",
    tracks: [
      { sku: "blakats_cd_01", title: "01. Can't Take It Back (Remix)", artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "blakats_cd_02", title: "02. Don't Feed The Animals",      artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_02_preview.mp3" },
      { sku: "blakats_cd_03", title: "03. Wild Cherry",                 artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_03_preview.mp3" },
      { sku: "blakats_cd_04", title: "04. Memories",                    artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_04_preview.mp3" },
      { sku: "blakats_cd_05", title: "05. Tonite",                      artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_05_preview.mp3" },
      { sku: "blakats_cd_06", title: "06. Ask Me Nicely",               artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_06_preview.mp3" },
      { sku: "blakats_cd_07", title: "07. Pure Heart",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_07_preview.mp3" },
      { sku: "blakats_cd_08", title: "08. Perfect Time For Love",       artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_08_preview.mp3" },
      { sku: "blakats_cd_09", title: "09. Hold Me Close",               artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_09_preview.mp3" },
      { sku: "blakats_cd_10", title: "10. (Track 10)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_10_preview.mp3" },
      { sku: "blakats_cd_11", title: "11. (Track 11)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_11_preview.mp3" },
      { sku: "blakats_cd_12", title: "12. (Track 12)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_12_preview.mp3" },
    ],
  },
  {
    id: "artist2",
    label: "Artist2",
    themeClass: "theme-artist2",
    tracks: [
      { sku: "artist2_track_01", title: "01. Sample Track One", artist: "Artist2", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "artist2_track_02", title: "02. Sample Track Two", artist: "Artist2", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_02_preview.mp3" },
    ],
  },
  {
    id: "artist3",
    label: "Artist3",
    themeClass: "theme-artist3",
    tracks: [
      { sku: "artist3_track_01", title: "01. Sample Track One", artist: "Artist3", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_03_preview.mp3" },
      { sku: "artist3_track_02", title: "02. Sample Track Two", artist: "Artist3", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_04_preview.mp3" },
    ],
  },
];

// Artist3 hero video config (use the loop mp4 you generated)
const ARTIST3_HERO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "Artist3 — Paint The Town Red (13s loop)",
};

/** =========================
 *  STATE
 *  ========================= */
let activeTabId = CATALOG[0]?.id || "blakats";

// preview state (only one preview at a time)
let audio = null;
let audioTimer = null;
let activePreviewBtn = null;
let activeWavebox = null;
let activeTimeEl = null;

/** =========================
 *  DOM HELPERS
 *  ========================= */
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtTime(seconds){
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** =========================
 *  PREVIEW CONTROL
 *  ========================= */
function stopPreview(){
  if (audio){
    try { audio.pause(); } catch {}
    audio = null;
  }
  if (audioTimer){
    clearInterval(audioTimer);
    audioTimer = null;
  }
  if (activePreviewBtn){
    activePreviewBtn.textContent = "▶ Preview";
    activePreviewBtn.removeAttribute("aria-pressed");
  }
  if (activeWavebox){
    activeWavebox.classList.remove("playing");
    activeWavebox.classList.add("idle");
  }
  if (activeTimeEl){
    activeTimeEl.textContent = `0:00 / ${fmtTime(PREVIEW_SECONDS)}`;
  }
  activePreviewBtn = null;
  activeWavebox = null;
  activeTimeEl = null;
}

function ensureWaveBars(wavebox){
  if (wavebox.dataset.ready === "1") return;
  wavebox.innerHTML = "";
  for (let i = 0; i < 24; i++){
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.setProperty("--i", String(i));
    wavebox.appendChild(bar);
  }
  wavebox.dataset.ready = "1";
  wavebox.classList.add("idle");
}

/** =========================
 *  PAYPAL
 *  ========================= */
async function createPayPalLink(product){
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok){
    const t = await res.text().catch(() => "");
    throw new Error(`create failed: HTTP ${res.status} ${t}`.trim());
  }

  const data = await res.json();
  if (!data || !data.url) throw new Error("create failed: missing url");
  return data.url;
}

/** =========================
 *  RENDER: TABS
 *  ========================= */
function renderTabs(){
  const tabsEl = $(".tabs");
  if (!tabsEl) return;

  tabsEl.innerHTML = "";

  CATALOG.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;

    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", tab.id === activeTabId ? "true" : "false");

    btn.addEventListener("click", () => {
      if (activeTabId === tab.id) return;
      stopPreview();           // stop any playing preview when switching tabs
      activeTabId = tab.id;
      renderAll();
    });

    tabsEl.appendChild(btn);
  });
}

/** =========================
 *  RENDER: PANELS + ROWS
 *  ========================= */
function renderPanels(){
  const panelsEl = $(".tab-panels");
  if (!panelsEl) return;

  panelsEl.innerHTML = "";

  CATALOG.forEach((tab) => {
    const panel = document.createElement("section");
    panel.className = `panel ${tab.themeClass} ${tab.id === activeTabId ? "active" : ""}`;
    panel.dataset.panel = tab.id;

    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = tab.label;
    panel.appendChild(header);

    // Artist3: hero video before track rows
    if (tab.id === "artist3") {
      const heroMount = document.createElement("div");
      panel.appendChild(heroMount);
      mountLoopingHeroVideo(heroMount, ARTIST3_HERO);
    }

    tab.tracks.forEach((track) => {
      panel.appendChild(renderTrackRow(track));
    });

    panelsEl.appendChild(panel);
  });

  // ensure wave bars exist after render
  $all(".wavebox").forEach(ensureWaveBars);
}

function renderTrackRow(track){
  const row = document.createElement("div");
  row.className = "track";

  // thumbnail
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.title = "Click to preview";
  const img = document.createElement("img");
  img.src = track.thumb;
  img.alt = `${track.title} cover`;
  thumb.appendChild(img);

  // meta
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <p class="name">${escapeHtml(track.title)}</p>
    <p class="artist">${escapeHtml(track.artist)}</p>
    <p class="price">$${escapeHtml(track.amount)}</p>
  `;

  // preview cluster
  const preview = document.createElement("div");
  preview.className = "preview";

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "preview-btn";
  previewBtn.textContent = "▶ Preview";

  const previewBoxWrap = document.createElement("div");
  previewBoxWrap.className = "preview-boxwrap";

  const wavebox = document.createElement("div");
  wavebox.className = "wavebox";
  wavebox.setAttribute("aria-hidden", "true");

  const timeEl = document.createElement("div");
  timeEl.className = "time";
  timeEl.textContent = `0:00 / ${fmtTime(PREVIEW_SECONDS)}`;

  previewBoxWrap.appendChild(wavebox);
  previewBoxWrap.appendChild(timeEl);

  preview.appendChild(previewBtn);
  preview.appendChild(previewBoxWrap);

  // buy
  const buy = document.createElement("div");
  buy.className = "buy";

  const buyBtn = document.createElement("button");
  buyBtn.type = "button";
  buyBtn.className = "buy-btn";
  buyBtn.textContent = "Buy & Download";

  buyBtn.addEventListener("click", async () => {
    buyBtn.disabled = true;
    const old = buyBtn.textContent;
    buyBtn.textContent = "Loading…";

    try {
      const product = {
        sku: track.sku,
        title: `${track.artist} — ${track.title}`,
        amount: track.amount,
      };
      const paypalUrl = await createPayPalLink(product);
      window.location.href = paypalUrl;
    } catch (err) {
      console.error(err);
      alert("Could not generate payment link. Please try again.");
      buyBtn.disabled = false;
      buyBtn.textContent = old;
    }
  });

  buy.appendChild(buyBtn);

  // preview handlers
  const audioUrl = `${PREVIEW_BASE}/${track.previewFile}`;

  async function togglePreview(){
    // if this row is currently active, stop it
    if (activePreviewBtn === previewBtn){
      stopPreview();
      return;
    }

    // stop any other preview
    stopPreview();

    // start this one
    ensureWaveBars(wavebox);
    wavebox.classList.remove("idle");
    wavebox.classList.add("playing");

    previewBtn.textContent = "⏸ Pause";
    previewBtn.setAttribute("aria-pressed", "true");

    activePreviewBtn = previewBtn;
    activeWavebox = wavebox;
    activeTimeEl = timeEl;

    audio = new Audio(audioUrl);
    audio.preload = "auto";

    let startedAt = 0;

    audio.addEventListener("ended", () => stopPreview());
    audio.addEventListener("error", () => {
      stopPreview();
      alert(`Preview failed to load:\n${audioUrl}`);
    });

    try{
      await audio.play();
      startedAt = performance.now();

      audioTimer = setInterval(() => {
        if (!audio) return;

        const elapsed = (performance.now() - startedAt) / 1000;
        const shown = Math.min(PREVIEW_SECONDS, elapsed);

        timeEl.textContent = `${fmtTime(shown)} / ${fmtTime(PREVIEW_SECONDS)}`;

        if (elapsed >= PREVIEW_SECONDS){
          stopPreview();
        }
      }, 120);
    } catch (e){
      stopPreview();
      console.error(e);
      alert("Browser blocked playback. Click Preview again.");
    }
  }

  previewBtn.addEventListener("click", togglePreview);
  thumb.addEventListener("click", togglePreview);

  // assemble
  row.appendChild(thumb);
  row.appendChild(meta);
  row.appendChild(preview);
  row.appendChild(buy);

  return row;
}

/** =========================
 *  HERO VIDEO (13s segment loop)
 *  ========================= */
function mountLoopingHeroVideo(containerEl, opts) {
  const {
    src,
    start = 0,
    duration = 13,
    poster = "",
    caption = "Preview",
  } = opts;

  containerEl.innerHTML = `
    <div class="hero-media">
      <video
        class="hero-video"
        ${poster ? `poster="${poster}"` : ""}
        muted
        autoplay
        playsinline
        preload="metadata"
      >
        <source src="${src}" type="video/mp4" />
      </video>
      <div class="hero-caption">${escapeHtml(caption)}</div>
    </div>
  `;

  const video = containerEl.querySelector("video.hero-video");
  if (!video) return;

  const end = start + duration;

  const seekToStart = () => {
    try { video.currentTime = start; } catch (_) {}
  };

  const onTimeUpdate = () => {
    if (video.currentTime >= end) {
      video.currentTime = start;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  video.addEventListener("loadedmetadata", () => {
    seekToStart();
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  video.addEventListener("timeupdate", onTimeUpdate);

  // fallback: if autoplay blocked, click to start
  containerEl.addEventListener("click", () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });
}

/** =========================
 *  MAIN RENDER
 *  ========================= */
function renderAll(){
  renderTabs();
  renderPanels();

  // refresh aria-selected after render
  $all(".tab").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === activeTabId ? "true" : "false");
  });
}

/** =========================
 *  INIT
 *  ========================= */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
});