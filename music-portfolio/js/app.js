/* ============================================================
   music-portfolio/js/app.js  (DROP-IN REPLACEMENT)
   Tabbed multi-artist catalog with:
   - Clickable thumbnails (play/pause preview)
   - 30s preview w/ placeholder waveform + timer
   - Buy button -> POST create -> redirect to PayPal
   - Hero video for BoomBash with 13s loop + mute/unmute button
   - Hero video for BlaKats with 13s loop + mute/unmute button (no preview audio impact)
   - LOGIC FIXES (BoomBash only):
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
      { sku: "1gnm_track_01", title: "01. Sample Track One", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "1gnm_track_02", title: "02. Sample Track Two", artist: "1GNM", amount: "0.99", thumb: "assets/1GNM.jpeg", previewFile: "blakats_cd_02_preview.mp3" },
    ],
  },

  {
    id: "boombash",
    label: "BoomBash",
    themeClass: "theme-artist3",
    tracks: [
      { sku: "boombash_track_01", title: "01. Sample Track One", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_03_preview.mp3" },
      { sku: "boombash_track_02", title: "02. Sample Track Two", artist: "BoomBash", amount: "1.29", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_04_preview.mp3" },
    ],
  },
];

/** =========================
 *  HERO VIDEO CONFIGS
 *  ========================= */

// BoomBash hero (RESTORED)
const HERO_TAB_ID = "boombash";
const HERO_VIDEO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BoomBash — Paint The Town Red (13s loop)",
};

// BlaKats hero (WITH AUDIO ON UNMUTE)
const BLAKATS_HERO_TAB_ID = "blakats";
const BLAKATS_HERO_VIDEO = {
  src: "assets/BLAKATS_VIDEO_WEB_SMALL.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BlaKats — Hero Video",
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

// BoomBash hero state
let heroVideoEl = null;
let heroMuteBtnEl = null;
let heroCleanupFn = null;

// BlaKats hero state (separate, never collides with BoomBash)
let blakatsHeroVideoEl = null;
let blakatsHeroMuteBtnEl = null;
let blakatsHeroCleanupFn = null;

// BoomBash Logic fix #2 state
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
 *  VIDEO MUTING / UI (BoomBash)
 *  ========================= */
function setHeroMuted(muted) {
  if (!heroVideoEl) return;
  heroVideoEl.muted = !!muted;

  if (heroMuteBtnEl) {
    heroMuteBtnEl.setAttribute("aria-pressed", String(!muted));
    heroMuteBtnEl.title = muted ? "Unmute audio" : "Mute audio";
    heroMuteBtnEl.textContent = muted ? "🔇 Muted" : "🔊 Sound";
  }
}

/**
 * BoomBash LOGIC FIX #1:
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
 * BoomBash LOGIC FIX #2:
 * If a preview is playing and user unmutes video, mute preview until preview completes,
 * then restore previews to default unmuted state.
 */
function maybeMutePreviewBecauseVideoUnmuted() {
  if (!isPreviewPlaying()) return;
  if (previewAudio) {
    previewAudio.muted = true;
    previewMutedByVideo = true;
  }
}

/** =========================
 *  VIDEO MUTING / UI (BlaKats)
 *  =========================
 * Requirement: BlaKats mute/unmute must NOT affect preview audios.
 */
function setBlakatsHeroMuted(muted) {
  if (!blakatsHeroVideoEl) return;
  blakatsHeroVideoEl.muted = !!muted;

  if (blakatsHeroMuteBtnEl) {
    blakatsHeroMuteBtnEl.setAttribute("aria-pressed", String(!muted));
    blakatsHeroMuteBtnEl.title = muted ? "Unmute audio" : "Mute audio";
    blakatsHeroMuteBtnEl.textContent = muted ? "🔇 Muted" : "🔊 Sound";
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

      stopPreview();
      stopHeroVideo();
      stopBlakatsHeroVideo();

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

    // BoomBash hero (restored)
    if (tab.id === HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "heroMount";
      panel.appendChild(heroMount);

      queueMicrotask(() => {
        mountLoopingHeroVideo(heroMount, HERO_VIDEO);
      });
    }

    // BlaKats hero (with audio on unmute)
    if (tab.id === BLAKATS_HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "blakatsHeroMount";
      panel.appendChild(heroMount);

      queueMicrotask(() => {
        mountLoopingBlaKatsHeroVideo(heroMount, BLAKATS_HERO_VIDEO);
      });
    }

    tab.tracks.forEach((track) => {
      panel.appendChild(renderTrackRow(track));
    });

    panelsEl.appendChild(panel);
  });

  $all(".wavebox").forEach(ensureWaveBars);
}

function renderTrackRow(track) {
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

  async function togglePreview() {
    if (activePreviewBtn === previewBtn) {
      stopPreview();
      return;
    }

    stopPreview();

    // BoomBash-only logic fix: mute BoomBash hero if preview starts while hero is unmuted
    if (activeTabId === HERO_TAB_ID) {
      maybeMuteVideoBecausePreviewStarted();
    }

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
    previewAudio.muted = false;
    previewMutedByVideo = false;

    let startedAt = 0;

    previewAudio.addEventListener("ended", () => {
      stopPreview();
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
 *  HERO VIDEO MOUNT / STOP (BoomBash)
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
  stopHeroVideo();

  const { src, start = 0, duration = 13, poster = "", caption = "Preview" } = opts;

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

  setHeroMuted(true);

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

  const onLoaded = () => {
    seekToStart();
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  video.addEventListener("loadedmetadata", onLoaded);
  video.addEventListener("timeupdate", onTimeUpdate);

  containerEl.addEventListener("click", () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  // BoomBash mute/unmute:
  // If preview is playing and user unmutes video, immediately mute preview until it completes.
  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      setHeroMuted(false);
      // ensure audio actually engages on gesture
      video.volume = 1;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      maybeMutePreviewBecauseVideoUnmuted();
    } else {
      setHeroMuted(true);
    }
  });

  heroCleanupFn = () => {
    video.removeEventListener("loadedmetadata", onLoaded);
    video.removeEventListener("timeupdate", onTimeUpdate);
  };
}

/** =========================
 *  HERO VIDEO MOUNT / STOP (BlaKats)
 *  ========================= */
function stopBlakatsHeroVideo() {
  if (blakatsHeroCleanupFn) {
    try { blakatsHeroCleanupFn(); } catch {}
    blakatsHeroCleanupFn = null;
  }
  if (blakatsHeroVideoEl) {
    try {
      blakatsHeroVideoEl.pause();
      blakatsHeroVideoEl.muted = true;
      blakatsHeroVideoEl.currentTime = 0;
    } catch {}
  }
  blakatsHeroVideoEl = null;
  blakatsHeroMuteBtnEl = null;
}

function mountLoopingBlaKatsHeroVideo(containerEl, opts) {
  stopBlakatsHeroVideo();

  const { src, start = 0, duration = 13, poster = "", caption = "Preview" } = opts;

  containerEl.innerHTML = `
    <div class="hero-media">
      <video
        class="hero-video blakats-hero-video"
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
        <button type="button" class="mute-btn blakats-mute-btn" aria-pressed="false" title="Unmute audio">🔇 Muted</button>
      </div>
    </div>
  `;

  const video = containerEl.querySelector("video.blakats-hero-video");
  const muteBtn = containerEl.querySelector("button.blakats-mute-btn");
  if (!video || !muteBtn) return;

  blakatsHeroVideoEl = video;
  blakatsHeroMuteBtnEl = muteBtn;

  // Start muted for autoplay; user gesture will enable sound.
  setBlakatsHeroMuted(true);

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

  const onLoaded = () => {
    seekToStart();
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  video.addEventListener("loadedmetadata", onLoaded);
  video.addEventListener("timeupdate", onTimeUpdate);

  // Click-to-play fallback (does not change mute state)
  containerEl.addEventListener("click", () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  // BlaKats mute/unmute:
  // IMPORTANT: does NOT touch preview audio at all.
  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      // user gesture: enable sound and force play so audio becomes audible
      setBlakatsHeroMuted(false);
      video.volume = 1;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      setBlakatsHeroMuted(true);
    }
  });

  blakatsHeroCleanupFn = () => {
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