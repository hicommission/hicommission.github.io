/* music-portfolio/js/app.js (FULL DROP-IN REPLACEMENT)
   REQUIREMENTS COVERED:
   1) Video mute button only affects the hero video (NOT previews).
   2) Changing tabs stops + mutes any currently playing hero video, then switches tab.
      (Also stops any currently playing preview audio.)
   3) Tab 2 renamed to 1GNM (+ metadata).
   4) Tab 3 renamed to BoomBash (+ metadata).
*/

"use strict";

/** =========================
 *  CONFIG
 *  ========================= */
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

const PREVIEW_SECONDS = 30;
const PREVIEW_BASE = "assets/previews";

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
    id: "1gnm",
    label: "1GNM",
    themeClass: "theme-1gnm",
    tracks: [
      // Replace with your real 1GNM tracks:
      { sku: "1gnm_track_01", title: "01. Sample Track One", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "1gnm_track_02", title: "02. Sample Track Two", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_02_preview.mp3" },
    ],
  },

  {
    id: "boombash",
    label: "BoomBash",
    themeClass: "theme-boombash",
    tracks: [
      // Replace with your real BoomBash tracks:
      { sku: "boombash_track_01", title: "01. Sample Track One", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_03_preview.mp3" },
      { sku: "boombash_track_02", title: "02. Sample Track Two", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_04_preview.mp3" },
    ],
  },
];

/** =========================
 *  HERO VIDEO CONFIG (BoomBash)
 *  ========================= */
const BOOMBASH_HERO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",   // <-- your loop MP4 (with audio)
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BoomBash — Paint The Town Red (13s loop)",
};

/** =========================
 *  STATE
 *  ========================= */
let activeTabId = CATALOG[0]?.id || "blakats";

/* Preview audio state (separate from hero video!) */
let previewAudio = null;
let previewTimer = null;
let activePreviewBtn = null;
let activeWavebox = null;
let activeTimeEl = null;

/* Hero video state (separate from preview audio!) */
const heroByTabId = new Map(); // tabId -> { videoEl, muteBtnEl, cleanupFn }

/** =========================
 *  HELPERS
 *  ========================= */
function $(sel, root = document){ return root.querySelector(sel); }
function $all(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

function fmtTime(seconds){
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/** =========================
 *  PREVIEW AUDIO (MP3) — STOP/START
 *  ========================= */
function stopPreview(){
  if (previewAudio){
    try { previewAudio.pause(); } catch {}
    previewAudio = null;
  }
  if (previewTimer){
    clearInterval(previewTimer);
    previewTimer = null;
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
 *  HERO VIDEO — STOP/MUTE (ONLY VIDEO!)
 *  ========================= */
function stopHeroVideoForTab(tabId){
  const hero = heroByTabId.get(tabId);
  if (!hero || !hero.videoEl) return;

  const v = hero.videoEl;
  try { v.pause(); } catch {}
  // requirement: changing tabs must mute and stop video
  v.muted = true;

  // reset to start frame quickly
  try { v.currentTime = 0; } catch {}

  // update mute button UI if present
  if (hero.muteBtnEl){
    hero.muteBtnEl.setAttribute("aria-pressed", "true");
    hero.muteBtnEl.textContent = "🔇 Muted";
    hero.muteBtnEl.title = "Unmute video audio";
  }
}

function playHeroVideoForTab(tabId){
  const hero = heroByTabId.get(tabId);
  if (!hero || !hero.videoEl) return;

  const v = hero.videoEl;

  // always start muted (user can unmute using the button)
  v.muted = true;

  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

/** =========================
 *  TAB SWITCH
 *  ========================= */
function setActiveTab(nextId){
  if (nextId === activeTabId) return;

  // Requirement #2: changing tabs must stop+mute currently playing hero video
  stopHeroVideoForTab(activeTabId);

  // Good UX: stop any playing preview audio when switching tabs
  stopPreview();

  activeTabId = nextId;

  // Update tab buttons
  $all(".tab").forEach((btn) => {
    const on = btn.dataset.tab === activeTabId;
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });

  // Update panels
  $all(".panel").forEach((p) => {
    p.classList.toggle("active", p.dataset.panel === activeTabId);
  });

  // If the new tab has hero video, (re)play it muted
  playHeroVideoForTab(activeTabId);
}

/** =========================
 *  RENDER: TABS
 *  ========================= */
function renderTabs(){
  const tabsEl = $(".tabs");
  tabsEl.innerHTML = "";

  CATALOG.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab ${tab.themeClass}`;
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.setAttribute("aria-selected", tab.id === activeTabId ? "true" : "false");

    btn.addEventListener("click", () => setActiveTab(tab.id));
    tabsEl.appendChild(btn);
  });
}

/** =========================
 *  RENDER: PANELS
 *  ========================= */
function renderPanels(){
  const panelsEl = $(".tab-panels");
  panelsEl.innerHTML = "";
  heroByTabId.clear();

  CATALOG.forEach((tab) => {
    const panel = document.createElement("section");
    panel.className = `panel ${tab.themeClass} ${tab.id === activeTabId ? "active" : ""}`;
    panel.dataset.panel = tab.id;

    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = tab.label;
    panel.appendChild(header);

    // Hero for BoomBash (tab 3)
    if (tab.id === "boombash"){
      const heroMount = document.createElement("div");
      heroMount.id = "boombashHero";
      panel.appendChild(heroMount);

      const { videoEl, muteBtnEl, cleanupFn } = mountLoopingHeroVideo(heroMount, BOOMBASH_HERO);
      heroByTabId.set(tab.id, { videoEl, muteBtnEl, cleanupFn });
    }

    // Tracks
    tab.tracks.forEach((track) => {
      panel.appendChild(renderTrackRow(track));
    });

    panelsEl.appendChild(panel);
  });

  // wavebars
  $all(".wavebox").forEach(ensureWaveBars);
}

/** =========================
 *  RENDER: TRACK ROW
 *  ========================= */
function renderTrackRow(track){
  const row = document.createElement("div");
  row.className = "track";

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.title = "Click to preview";
  const img = document.createElement("img");
  img.src = track.thumb;
  img.alt = `${track.title} cover`;
  thumb.appendChild(img);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <p class="name">${escapeHtml(track.title)}</p>
    <p class="artist">${escapeHtml(track.artist)}</p>
    <p class="price">$${escapeHtml(track.amount)}</p>
  `;

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

  const audioUrl = `${PREVIEW_BASE}/${track.previewFile}`;

  async function togglePreview(){
    // If this row is active, stop it
    if (activePreviewBtn === previewBtn){
      stopPreview();
      return;
    }

    // Stop other preview
    stopPreview();

    // NOTE: requirement #1 -> do NOT touch hero video mute state here.
    // The hero video mute button controls ONLY the hero video.

    ensureWaveBars(wavebox);
    wavebox.classList.remove("idle");
    wavebox.classList.add("playing");

    previewBtn.textContent = "⏸ Pause";
    previewBtn.setAttribute("aria-pressed", "true");

    activePreviewBtn = previewBtn;
    activeWavebox = wavebox;
    activeTimeEl = timeEl;

    previewAudio = new Audio(audioUrl);
    previewAudio.preload = "auto";

    let startedAt = 0;

    previewAudio.addEventListener("ended", () => stopPreview());
    previewAudio.addEventListener("error", () => {
      stopPreview();
      alert(`Preview failed to load:\n${audioUrl}`);
    });

    try{
      await previewAudio.play();
      startedAt = performance.now();

      previewTimer = setInterval(() => {
        if (!previewAudio) return;

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
      alert("Browser blocked autoplay. Click Preview again.");
    }
  }

  previewBtn.addEventListener("click", togglePreview);
  thumb.addEventListener("click", togglePreview);

  row.appendChild(thumb);
  row.appendChild(meta);
  row.appendChild(preview);
  row.appendChild(buy);

  return row;
}

/** =========================
 *  HERO VIDEO MOUNT (BoomBash)
 *  - Segment looping
 *  - Mute button ONLY mutes this video element
 *  ========================= */
function mountLoopingHeroVideo(containerEl, opts){
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

      <div class="hero-caption">
        <div class="hero-caption-row">
          <span>${escapeHtml(caption)}</span>
          <button type="button"
                  class="mute-btn"
                  aria-pressed="true"
                  title="Unmute video audio">
            🔇 Muted
          </button>
        </div>
      </div>
    </div>
  `;

  const videoEl = containerEl.querySelector("video.hero-video");
  const muteBtnEl = containerEl.querySelector("button.mute-btn");

  const end = start + duration;

  const seekToStart = () => { try { videoEl.currentTime = start; } catch {} };

  const onTimeUpdate = () => {
    if (videoEl.currentTime >= end){
      try { videoEl.currentTime = start; } catch {}
      const p = videoEl.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  videoEl.addEventListener("loadedmetadata", () => {
    // Always start muted. User can unmute using the button.
    videoEl.muted = true;
    seekToStart();

    const p = videoEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  videoEl.addEventListener("timeupdate", onTimeUpdate);

  // Mute button affects ONLY this video element (Requirement #1)
  muteBtnEl.addEventListener("click", () => {
    // toggle mute state on the video ONLY
    videoEl.muted = !videoEl.muted;

    if (videoEl.muted){
      muteBtnEl.setAttribute("aria-pressed", "true");
      muteBtnEl.textContent = "🔇 Muted";
      muteBtnEl.title = "Unmute video audio";
    } else {
      muteBtnEl.setAttribute("aria-pressed", "false");
      muteBtnEl.textContent = "🔊 Sound";
      muteBtnEl.title = "Mute video audio";
    }

    // keep video playing
    const p = videoEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  // If autoplay gets blocked, click anywhere in the hero to start video (still muted)
  containerEl.addEventListener("click", () => {
    const p = videoEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  const cleanupFn = () => {
    videoEl.removeEventListener("timeupdate", onTimeUpdate);
  };

  return { videoEl, muteBtnEl, cleanupFn };
}

/** =========================
 *  INIT
 *  ========================= */
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  renderPanels();

  // Start the active tab's hero video (if any) muted
  playHeroVideoForTab(activeTabId);
});