/* ============================================================
   music-portfolio/js/app.js  (DROP-IN REPLACEMENT)
   Tabbed multi-artist catalog with:
   - Clickable thumbnails (play/pause preview)
   - 30s preview w/ placeholder waveform + timer
   - Buy button -> POST create -> redirect to PayPal
   - Hero video for Tab 3 with 13s loop + mute/unmute button
   - LOGIC FIXES:
     1) If video is playing AND unmuted, starting ANY preview will immediately mute the video.
     2) If a preview is playing AND user unmutes video, the preview audio is immediately muted
        until preview completes; then previews return to default (unmuted) state.
   ============================================================ */

/** =========================
 *  CONFIG
 *  ========================= */
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

// Preview length (seconds)
const PREVIEW_SECONDS = 30;

// Where previews live (GitHub Pages)
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
      { sku: "blakats_cd_08", title: "08. Perfect Time For Love",        artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_08_preview.mp3" },
      { sku: "blakats_cd_09", title: "09. Hold Me Close",               artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_09_preview.mp3" },
      { sku: "blakats_cd_10", title: "10. (Track 10)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_10_preview.mp3" },
      { sku: "blakats_cd_11", title: "11. (Track 11)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_11_preview.mp3" },
      { sku: "blakats_cd_12", title: "12. (Track 12)",                  artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_12_preview.mp3" },
    ],
  },

  {
    id: "1gnm",
    label: "1GNM",
    themeClass: "theme-artist2",
    tracks: [
      // Replace these with your real 1GNM tracks:
      { sku: "1gnm_track_01", title: "01. Sample Track One", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "1gnm_track_02", title: "02. Sample Track Two", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_02_preview.mp3" },
    ],
  },

  {
    id: "boombash",
    label: "BoomBash",
    themeClass: "theme-artist3",
    tracks: [
      // Replace these with your real BoomBash tracks:
      { sku: "boombash_track_01", title: "01. Sample Track One", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_03_preview.mp3" },
      { sku: "boombash_track_02", title: "02. Sample Track Two", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_04_preview.mp3" },
    ],
  },
];

// Hero video config (Tab 3)
const HERO_TAB_ID = "boombash";
const HERO_VIDEO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BoomBash — Paint The Town Red (13s loop)",
};

/** =========================
 *  STATE
 *  ========================= */
let activeTabId = CATALOG[0]?.id || "blakats";

// Preview audio state
let previewAudio = null;
let previewTimer = null;
let activePreviewBtn = null;
let activeWavebox = null;
let activeTimeEl = null;

// Video hero state (separate from preview audio)
let heroVideoEl = null;
let heroMuteBtnEl = null;
let heroCleanupFn = null;

// Logic fix #2: if user unmutes video while a preview is playing,
// we mute the preview audio until it completes.
let previewMutedByVideo = false;

/** =========================
 *  HELPERS
 *  ========================= */
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function isPreviewPlaying() {
  return !!(previewAudio && !previewAudio.paused && !previewAudio.ended);
}

/** =========================
 *  VIDEO MUTING / UI
 *  ========================= */
function setHeroMuted(muted) {
  if (!heroVideoEl) return;
  heroVideoEl.muted = !!muted;

  // Update button label/state if present
  if (heroMuteBtnEl) {
    heroMuteBtnEl.setAttribute("aria-pressed", String(!muted));
    heroMuteBtnEl.title = muted ? "Unmute audio" : "Mute audio";
    heroMuteBtnEl.textContent = muted ? "🔇 Muted" : "🔊 Sound";
  }
}

/**
 * LOGIC FIX #1:
 * If hero video is playing AND unmuted, starting any preview mutes the video immediately.
 */
function maybeMuteVideoBecausePreviewStarted() {
  if (!heroVideoEl) return;
  const videoIsPlaying = !heroVideoEl.paused && !heroVideoEl.ended;
  const videoIsUnmuted = heroVideoEl.muted === false;

  if (videoIsPlaying && videoIsUnmuted) {
    setHeroMuted(true);
  }
}

/**
 * LOGIC FIX #2:
 * If a preview is playing and user unmutes video, mute preview until preview completes,
 * then restore previews to default unmuted state.
 */
function maybeMutePreviewBecauseVideoUnmuted() {
  if (!isPreviewPlaying()) return;

  // Mute preview audio until it ends
  if (previewAudio) {
    previewAudio.muted = true;
    previewMutedByVideo = true;
  }
}

/** =========================
 *  PREVIEW CONTROL
 *  ========================= */
function ensureWaveBars(wavebox) {
  if (wavebox.dataset.ready === "1") return;
  wavebox.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.setProperty("--i", String(i));
    wavebox.appendChild(bar);
  }
  wavebox.dataset.ready = "1";
  wavebox.classList.add("idle");
}

function stopPreview() {
  // restore "default unmuted state" if we muted preview due to video
  if (previewAudio && previewMutedByVideo) {
    previewAudio.muted = false;
    previewMutedByVideo = false;
  }

  if (previewAudio) {
    try { previewAudio.pause(); } catch {}
    previewAudio = null;
  }

  if (previewTimer) {
    clearInterval(previewTimer);
    previewTimer = null;
  }

  if (activePreviewBtn) {
    activePreviewBtn.textContent = "▶ Preview";
    activePreviewBtn.removeAttribute("aria-pressed");
  }

  if (activeWavebox) {
    activeWavebox.classList.remove("playing");
    activeWavebox.classList.add("idle");
  }

  if (activeTimeEl) {
    activeTimeEl.textContent = `0:00 / ${fmtTime(PREVIEW_SECONDS)}`;
  }

  activePreviewBtn = null;
  activeWavebox = null;
  activeTimeEl = null;
}

/** =========================
 *  PAYPAL
 *  ========================= */
async function createPayPalLink(product) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
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
function renderTabs() {
  const nav = $(".tabs");
  nav.innerHTML = "";

  CATALOG.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.setAttribute("aria-selected", tab.id === activeTabId ? "true" : "false");

    btn.addEventListener("click", () => {
      if (tab.id === activeTabId) return;

      // Stop preview when switching tabs
      stopPreview();

      // Stop and mute current hero video when changing tabs
      stopHeroVideo();

      activeTabId = tab.id;
      renderAll();
    });

    nav.appendChild(btn);
  });
}

/** =========================
 *  RENDER: PANELS / TRACKS
 *  ========================= */
function renderPanels() {
  const panelsEl = $(".tab-panels");
  panelsEl.innerHTML = "";

  CATALOG.forEach((tab) => {
    const panel = document.createElement("section");
    panel.className = `panel ${tab.themeClass} ${tab.id === activeTabId ? "active" : ""}`;
    panel.dataset.panel = tab.id;

    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = tab.label;
    panel.appendChild(header);

    // Hero video only on HERO_TAB_ID
    if (tab.id === HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "heroMount";
      panel.appendChild(heroMount);

      // Mount after in DOM
      queueMicrotask(() => {
        mountLoopingHeroVideo(heroMount, HERO_VIDEO);
      });
    }

    tab.tracks.forEach((track) => {
      panel.appendChild(renderTrackRow(track));
    });

    panelsEl.appendChild(panel);
  });

  // after render, prep wavebars
  $all(".wavebox").forEach(ensureWaveBars);
}

function renderTrackRow(track) {
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

  // buy button
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

  async function togglePreview() {
    // if this row is currently active, stop it
    if (activePreviewBtn === previewBtn) {
      stopPreview();
      return;
    }

    // stop any other preview
    stopPreview();

    // LOGIC FIX #1:
    // If hero video is playing and unmuted, mute it immediately when preview starts.
    maybeMuteVideoBecausePreviewStarted();

    // start this preview
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

    // default preview audio should be unmuted (unless video-unmute forced muting later)
    previewAudio.muted = false;
    previewMutedByVideo = false;

    let startedAt = 0;

    previewAudio.addEventListener("ended", () => {
      stopPreview(); // also restores default unmuted state if we muted due to video
    });

    previewAudio.addEventListener("error", () => {
      stopPreview();
      alert(`Preview failed to load:\n${audioUrl}`);
    });

    try {
      await previewAudio.play();
      startedAt = performance.now();

      previewTimer = setInterval(() => {
        if (!previewAudio) return;

        const elapsed = (performance.now() - startedAt) / 1000;
        const shown = Math.min(PREVIEW_SECONDS, elapsed);

        timeEl.textContent = `${fmtTime(shown)} / ${fmtTime(PREVIEW_SECONDS)}`;

        if (elapsed >= PREVIEW_SECONDS) {
          stopPreview();
        }
      }, 120);
    } catch (e) {
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
 *  HERO VIDEO MOUNT / STOP
 *  ========================= */
function stopHeroVideo() {
  if (heroCleanupFn) {
    try { heroCleanupFn(); } catch {}
    heroCleanupFn = null;
  }
  if (heroVideoEl) {
    try {
      heroVideoEl.pause();
      heroVideoEl.muted = true;
      heroVideoEl.currentTime = 0;
    } catch {}
  }
  heroVideoEl = null;
  heroMuteBtnEl = null;
}

function mountLoopingHeroVideo(containerEl, opts) {
  // Clean up any previous hero (important when re-rendering)
  stopHeroVideo();

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

      <div class="hero-caption hero-caption-row">
        <span>${escapeHtml(caption)}</span>
        <button type="button" class="mute-btn" aria-pressed="false" title="Unmute audio">🔇 Muted</button>
      </div>
    </div>
  `;

  const video = containerEl.querySelector("video.hero-video");
  const muteBtn = containerEl.querySelector("button.mute-btn");
  if (!video || !muteBtn) return;

  heroVideoEl = video;
  heroMuteBtnEl = muteBtn;

  // Start muted by default for autoplay policy. User can enable Sound.
  setHeroMuted(true);

  const end = start + duration;

  const seekToStart = () => {
    try { video.currentTime = start; } catch (_) {}
  };

  const onTimeUpdate = () => {
    // Loop only the segment
    if (video.currentTime >= end) {
      video.currentTime = start;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  const onLoaded = () => {
    seekToStart();
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  video.addEventListener("loadedmetadata", onLoaded);
  video.addEventListener("timeupdate", onTimeUpdate);

  // Click-to-play fallback
  containerEl.addEventListener("click", () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  // Mute/unmute button:
  // LOGIC FIX #2:
  // If preview is playing and user unmutes video, immediately mute preview until it completes.
  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      // user wants SOUND on video
      setHeroMuted(false);

      // If a preview is currently playing, mute preview until completion
      maybeMutePreviewBecauseVideoUnmuted();
    } else {
      // user mutes video
      setHeroMuted(true);
    }
  });

  heroCleanupFn = () => {
    video.removeEventListener("loadedmetadata", onLoaded);
    video.removeEventListener("timeupdate", onTimeUpdate);
  };
}

/** =========================
 *  TOP-LEVEL RENDER
 *  ========================= */
function renderAll() {
  renderTabs();
  renderPanels();

  // Ensure active aria-selected
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