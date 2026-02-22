/* ============================================================
   music-portfolio/js/app.js  (FULL DROP-IN REPLACEMENT)
   ✅ Goals:
   - PayPal works for ALL tracks on ALL tabs
   - Stripe works for ALL tracks on ALL tabs in ONE of two ways:
       A) If you provide STRIPE_LINKS[sku] (Payment Link), it will redirect there
       B) Otherwise it will call your Worker endpoint /api/stripe/create (recommended)
          which should return { url } for a Checkout Session.
   - DOES NOT change any preview / hero-video logic
   - Adds better error reporting so you can see WHY PayPal/Stripe fails
   ============================================================ */

/** =========================
 *  CONFIG
 *  ========================= */
const CLOUDFLARE_BASE = "https://cliquetraxx.com";

// PayPal create endpoint (your Worker)
const PAYPAL_CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

// Stripe create endpoint (your Worker) — recommended so Stripe works for ALL SKUs
// Your Worker should implement POST /api/stripe/create -> { url }
// If you do NOT have it yet, Stripe will fall back to STRIPE_LINKS[sku] when present.
const STRIPE_CREATE_URL = `${CLOUDFLARE_BASE}/api/stripe/create`;

// Preview length (seconds)
const PREVIEW_SECONDS = 30;

// Where previews live (GitHub Pages)
const PREVIEW_BASE = "assets/previews";

/** =========================
 *  STRIPE PAYMENT LINKS (OPTION A)
 *  =========================
 * If you are using Stripe Payment Links (buy.stripe.com/...), put them here.
 * If a SKU is NOT present here, the code will try OPTION B:
 *   POST /api/stripe/create
 */
const STRIPE_LINKS = {
  // BlaKats
  blakats_cd_01: "https://buy.stripe.com/7sY8wP0G8bGF4j7ercfjG01",

  // Add the rest as you create them, OR use /api/stripe/create for everything:
  // blakats_cd_02: "https://buy.stripe.com/....",
  // ...
  // 1gnm_track_01: "https://buy.stripe.com/....",
  // boombash_track_01: "https://buy.stripe.com/....",
};

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

// BoomBash hero (restored)
const HERO_TAB_ID = "boombash";
const HERO_VIDEO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BoomBash — Paint The Town Red (13s loop)",
};

// BlaKats hero (with audio on unmute)
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

// BlaKats hero state
let blakatsHeroVideoEl = null;
let blakatsHeroMuteBtnEl = null;
let blakatsHeroCleanupFn = null;

// BoomBash logic fix #2 flag
let previewMutedByVideo = false;

// BlaKats: mute-preview-while-video-unmuted flag
let previewMutedByBlakatsVideo = false;

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

function normalizeAmount(amountStr) {
  const n = Number(String(amountStr || "").trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid amount: ${amountStr}`);
  return n.toFixed(2);
}

async function postJsonExpectJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`${url} failed: HTTP ${res.status} ${raw}`.trim());
  }

  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${url} returned non-JSON: ${raw}`); }

  return data;
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

function maybeMuteVideoBecausePreviewStarted() {
  if (!heroVideoEl) return;
  const videoIsPlaying = !heroVideoEl.paused && !heroVideoEl.ended;
  const videoIsUnmuted = heroVideoEl.muted === false;

  if (videoIsPlaying && videoIsUnmuted) {
    setHeroMuted(true);
  }
}

function maybeMutePreviewBecauseVideoUnmuted() {
  if (!isPreviewPlaying()) return;
  if (previewAudio) {
    previewAudio.muted = true;
    previewMutedByVideo = true;
  }
}

/** =========================
 *  VIDEO MUTING / UI (BlaKats)
 *  ========================= */
function setBlakatsHeroMuted(muted) {
  if (!blakatsHeroVideoEl) return;
  blakatsHeroVideoEl.muted = !!muted;

  if (blakatsHeroMuteBtnEl) {
    blakatsHeroMuteBtnEl.setAttribute("aria-pressed", String(!muted));
    blakatsHeroMuteBtnEl.title = muted ? "Unmute audio" : "Mute audio";
    blakatsHeroMuteBtnEl.textContent = muted ? "🔇 Muted" : "🔊 Sound";
  }
}

function maybeMuteBlakatsVideoBecausePreviewStarted() {
  if (!blakatsHeroVideoEl) return;
  const videoIsPlaying = !blakatsHeroVideoEl.paused && !blakatsHeroVideoEl.ended;
  const videoIsUnmuted = blakatsHeroVideoEl.muted === false;

  if (videoIsPlaying && videoIsUnmuted) {
    setBlakatsHeroMuted(true);
  }
}

function maybeMutePreviewBecauseBlakatsVideoUnmuted() {
  if (!isPreviewPlaying()) return;
  if (previewAudio) {
    previewAudio.muted = true;
    previewMutedByBlakatsVideo = true;
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

  if (previewAudio && previewMutedByBlakatsVideo) {
    previewAudio.muted = false;
    previewMutedByBlakatsVideo = false;
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
async function createPayPalLink(track) {
  const payload = {
    sku: String(track.sku || "").trim(),
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };

  const data = await postJsonExpectJson(PAYPAL_CREATE_URL, payload);
  if (!data?.url) throw new Error(`PayPal create missing url: ${JSON.stringify(data)}`);
  return data.url;
}

/** =========================
 *  STRIPE
 *  =========================
 * Works in two modes:
 *  - If STRIPE_LINKS[sku] exists -> redirect to Payment Link
 *  - Else -> call Worker /api/stripe/create -> { url } (recommended)
 */
async function createStripeLinkViaWorker(track) {
  const payload = {
    sku: String(track.sku || "").trim(),
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };

  const data = await postJsonExpectJson(STRIPE_CREATE_URL, payload);
  if (!data?.url) throw new Error(`Stripe create missing url: ${JSON.stringify(data)}`);
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

    // BlaKats hero
    if (tab.id === BLAKATS_HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "blakatsHeroMount";
      panel.appendChild(heroMount);

      queueMicrotask(() => {
        mountLoopingBlaKatsHeroVideo(heroMount, BLAKATS_HERO_VIDEO);
      });
    }

    // BoomBash hero
    if (tab.id === HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "heroMount";
      panel.appendChild(heroMount);

      queueMicrotask(() => {
        mountLoopingHeroVideo(heroMount, HERO_VIDEO);
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

  // buy button cluster
  const buy = document.createElement("div");
  buy.className = "buy";

  // PayPal button
  const buyBtn = document.createElement("button");
  buyBtn.type = "button";
  buyBtn.className = "buy-btn";
  buyBtn.textContent = "Buy & Download";

  buyBtn.addEventListener("click", async () => {
    buyBtn.disabled = true;
    const old = buyBtn.textContent;
    buyBtn.textContent = "Loading…";

    try {
      const paypalUrl = await createPayPalLink(track);
      window.location.href = paypalUrl;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not generate PayPal payment link. Please try again.");
      buyBtn.disabled = false;
      buyBtn.textContent = old;
    }
  });

  buy.appendChild(buyBtn);

  // Stripe button (works for ALL tabs)
  const stripeBtn = document.createElement("button");
  stripeBtn.type = "button";
  stripeBtn.className = "buy-btn stripe-btn";
  stripeBtn.textContent = "Pay w/ Stripe";

  stripeBtn.addEventListener("click", async () => {
    stripeBtn.disabled = true;
    const old = stripeBtn.textContent;
    stripeBtn.textContent = "Loading…";

    try {
      // OPTION A: Payment Link directly
      const direct = STRIPE_LINKS[track.sku];
      if (direct) {
        window.location.href = direct;
        return;
      }

      // OPTION B: Worker creates Checkout Session for ANY SKU
      const url = await createStripeLinkViaWorker(track);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert(
        (err?.message || "Could not start Stripe checkout.") +
        "\n\nIf you are using Payment Links, add STRIPE_LINKS[sku].\nIf you want Stripe for ALL items, implement POST /api/stripe/create on the Worker."
      );
      stripeBtn.disabled = false;
      stripeBtn.textContent = old;
    }
  });

  buy.appendChild(stripeBtn);

  // Preview audio
  const audioUrl = `${PREVIEW_BASE}/${track.previewFile}`;

  async function togglePreview() {
    if (activePreviewBtn === previewBtn) {
      stopPreview();
      return;
    }

    stopPreview();

    // BoomBash: starting ANY preview mutes hero if unmuted
    if (activeTabId === HERO_TAB_ID) {
      maybeMuteVideoBecausePreviewStarted();
    }

    // BlaKats: starting ANY preview mutes hero if unmuted
    if (activeTabId === BLAKATS_HERO_TAB_ID) {
      maybeMuteBlakatsVideoBecausePreviewStarted();
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
    previewMutedByBlakatsVideo = false;

    previewAudio.addEventListener("ended", () => {
      stopPreview();
    });

    previewAudio.addEventListener("error", () => {
      stopPreview();
      alert(`Preview failed to load:\n${audioUrl}`);
    });

    let startedAt = 0;

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

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      setHeroMuted(false);
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

  containerEl.addEventListener("click", () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      setBlakatsHeroMuted(false);
      video.volume = 1;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      maybeMutePreviewBecauseBlakatsVideoUnmuted();
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