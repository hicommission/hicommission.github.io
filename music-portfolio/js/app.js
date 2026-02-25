/* ============================================================
   music-portfolio/js/app.js  (FULL DROP-IN REPLACEMENT)

   ✅ Goals:
   - PayPal works for ALL tracks on ALL tabs
   - Stripe works for ALL tracks on ALL tabs:
       A) STRIPE_LINKS[sku] -> Payment Link
       B) else POST /api/stripe/create -> { url }
   - Stripe button sits NEXT TO PayPal button
   - ✅ BlaKats Barcode + Download Wild CD buttons appear BELOW Hero Video
   - ✅ Fixes waveform bleeding into buy buttons
   ============================================================ */

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;
const STRIPE_CREATE_URL = `${CLOUDFLARE_BASE}/api/stripe/create`;

const PREVIEW_SECONDS = 30;
const PREVIEW_BASE = "assets/previews";

// BlaKats: Barcode + Full CD download
const BLAKATS_BARCODE_IMG_URL = "assets/downloads/blakats_barcode.png";
// Full-CD ZIP must be on Cloudflare
const BLAKATS_CD_ZIP_URL = `${CLOUDFLARE_BASE}/assets/downloads/BlaKatsWildCDMP3s.zip`;

/** Stripe Payment Links (optional) */
const STRIPE_LINKS = {
  blakats_cd_01: "https://buy.stripe.com/7sY8wP0G8bGF4j7ercfjG01",
};

/** Catalog */
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

/** Hero configs */
const HERO_TAB_ID = "boombash";
const HERO_VIDEO = {
  src: "assets/BlaKatsPaint_the_TownRed_loop.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BoomBash — Paint The Town Red (13s loop)",
};

const BLAKATS_HERO_TAB_ID = "blakats";
const BLAKATS_HERO_VIDEO = {
  src: "assets/BLAKATS_VIDEO_WEB_SMALL.mp4",
  start: 0,
  duration: 13,
  poster: "assets/pop-cover.jpg",
  caption: "BlaKats — Hero Video",
};

/** State */
let activeTabId = CATALOG[0]?.id || "blakats";

let previewAudio = null;
let previewTimer = null;
let activePreviewBtn = null;
let activeWavebox = null;
let activeTimeEl = null;

let heroVideoEl = null;
let heroMuteBtnEl = null;
let heroCleanupFn = null;

let blakatsHeroVideoEl = null;
let blakatsHeroMuteBtnEl = null;
let blakatsHeroCleanupFn = null;

let previewMutedByVideo = false;
let previewMutedByBlakatsVideo = false;

/** Helpers */
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
  if (!res.ok) throw new Error(`${url} failed: HTTP ${res.status}\n\n${raw}`.trim());

  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${url} returned non-JSON:\n\n${raw}`); }

  return data;
}

/** Barcode modal */
function ensureBarcodeModal() {
  let modal = $("#qrModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "qrModal";
  modal.className = "qr-modal";
  modal.innerHTML = `
    <div class="qr-card" role="dialog" aria-modal="true" aria-label="Barcode">
      <div class="qr-card-header">
        <div>Scan to Buy & Download</div>
        <button type="button" class="qr-close" aria-label="Close">Close</button>
      </div>
      <div class="qr-body">
        <img alt="BlaKats barcode" src="${BLAKATS_BARCODE_IMG_URL}" />
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBarcodeModal();
  });
  modal.querySelector(".qr-close").addEventListener("click", closeBarcodeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBarcodeModal();
  });

  document.body.appendChild(modal);
  return modal;
}

function openBarcodeModal() { ensureBarcodeModal().classList.add("open"); }
function closeBarcodeModal() { const m = $("#qrModal"); if (m) m.classList.remove("open"); }

/** Preview bars */
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
  if (previewAudio && previewMutedByVideo) { previewAudio.muted = false; previewMutedByVideo = false; }
  if (previewAudio && previewMutedByBlakatsVideo) { previewAudio.muted = false; previewMutedByBlakatsVideo = false; }

  if (previewAudio) { try { previewAudio.pause(); } catch {} previewAudio = null; }
  if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }

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

/** PayPal / Stripe */
async function createPayPalLink(track) {
  const payload = {
    sku: String(track.sku || "").trim(),
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };
  const data = await postJsonExpectJson(PAYPAL_CREATE_URL, payload);
  if (!data?.url) throw new Error(`PayPal create missing url:\n\n${JSON.stringify(data)}`);
  return data.url;
}

async function createStripeLinkViaWorker(track) {
  const payload = {
    sku: String(track.sku || "").trim(),
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };
  const data = await postJsonExpectJson(STRIPE_CREATE_URL, payload);
  if (!data?.url) throw new Error(`Stripe create missing url:\n\n${JSON.stringify(data)}`);
  return data.url;
}

/** Hero muting helpers (unchanged) */
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
  const playing = !heroVideoEl.paused && !heroVideoEl.ended;
  const unmuted = heroVideoEl.muted === false;
  if (playing && unmuted) setHeroMuted(true);
}

function maybeMutePreviewBecauseVideoUnmuted() {
  if (!isPreviewPlaying()) return;
  if (previewAudio) { previewAudio.muted = true; previewMutedByVideo = true; }
}

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
  const playing = !blakatsHeroVideoEl.paused && !blakatsHeroVideoEl.ended;
  const unmuted = blakatsHeroVideoEl.muted === false;
  if (playing && unmuted) setBlakatsHeroMuted(true);
}

function maybeMutePreviewBecauseBlakatsVideoUnmuted() {
  if (!isPreviewPlaying()) return;
  if (previewAudio) { previewAudio.muted = true; previewMutedByBlakatsVideo = true; }
}

/** Render tabs */
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

/** Render panels */
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

      queueMicrotask(() => mountLoopingBlaKatsHeroVideo(heroMount, BLAKATS_HERO_VIDEO));
    }

    // BoomBash hero
    if (tab.id === HERO_TAB_ID) {
      const heroMount = document.createElement("div");
      heroMount.id = "heroMount";
      panel.appendChild(heroMount);

      queueMicrotask(() => mountLoopingHeroVideo(heroMount, HERO_VIDEO));
    }

    // ✅ BELOW HERO: BlaKats tools row (Barcode + Download Wild CD)
    if (tab.id === "blakats") {
      const tools = document.createElement("div");
      tools.className = "panel-tools below-hero";

      const barcodeBtn = document.createElement("button");
      barcodeBtn.type = "button";
      barcodeBtn.className = "tool-btn secondary";
      barcodeBtn.textContent = "Barcode";
      barcodeBtn.addEventListener("click", openBarcodeModal);

      const cdBtn = document.createElement("button");
      cdBtn.type = "button";
      cdBtn.className = "tool-btn primary";
      cdBtn.textContent = "Download BlaKats Wild CD";
      cdBtn.addEventListener("click", () => { window.location.href = BLAKATS_CD_ZIP_URL; });

      tools.appendChild(barcodeBtn);
      tools.appendChild(cdBtn);
      panel.appendChild(tools);
    }

    // ✅ wrap tracks so we can push them down consistently
    const tracksWrap = document.createElement("div");
    tracksWrap.className = "tracks-wrap";

    tab.tracks.forEach((track) => tracksWrap.appendChild(renderTrackRow(track)));
    panel.appendChild(tracksWrap);

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
      const paypalUrl = await createPayPalLink(track);
      window.location.href = paypalUrl;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not generate PayPal payment link. Please try again.");
      buyBtn.disabled = false;
      buyBtn.textContent = old;
    }
  });

  const stripeBtn = document.createElement("button");
  stripeBtn.type = "button";
  stripeBtn.className = "buy-btn stripe-btn";
  stripeBtn.textContent = "Pay w/ Stripe";

  stripeBtn.addEventListener("click", async () => {
    stripeBtn.disabled = true;
    const old = stripeBtn.textContent;
    stripeBtn.textContent = "Loading…";
    try {
      const direct = STRIPE_LINKS[track.sku];
      if (direct) { window.location.href = direct; return; }
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

  buy.appendChild(buyBtn);
  buy.appendChild(stripeBtn);

  const audioUrl = `${PREVIEW_BASE}/${track.previewFile}`;

  async function togglePreview() {
    if (activePreviewBtn === previewBtn) { stopPreview(); return; }

    stopPreview();

    if (activeTabId === HERO_TAB_ID) maybeMuteVideoBecausePreviewStarted();
    if (activeTabId === BLAKATS_HERO_TAB_ID) maybeMuteBlakatsVideoBecausePreviewStarted();

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

    previewAudio.addEventListener("ended", stopPreview);
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
        if (elapsed >= PREVIEW_SECONDS) stopPreview();
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

/** Hero mount/stop (BoomBash) */
function stopHeroVideo() {
  if (heroCleanupFn) { try { heroCleanupFn(); } catch {} heroCleanupFn = null; }
  if (heroVideoEl) {
    try { heroVideoEl.pause(); heroVideoEl.muted = true; heroVideoEl.currentTime = 0; } catch {}
  }
  heroVideoEl = null;
  heroMuteBtnEl = null;
}

function mountLoopingHeroVideo(containerEl, opts) {
  stopHeroVideo();
  const { src, start = 0, duration = 13, poster = "", caption = "Preview" } = opts;

  containerEl.innerHTML = `
    <div class="hero-media">
      <video class="hero-video" ${poster ? `poster="${poster}"` : ""} muted autoplay playsinline preload="metadata">
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
  const onLoaded = () => { try { video.currentTime = start; } catch {} video.play?.().catch?.(() => {}); };
  const onTimeUpdate = () => {
    if (video.currentTime >= end) { video.currentTime = start; video.play?.().catch?.(() => {}); }
  };

  video.addEventListener("loadedmetadata", onLoaded);
  video.addEventListener("timeupdate", onTimeUpdate);

  containerEl.addEventListener("click", () => video.play?.().catch?.(() => {}));

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      setHeroMuted(false);
      video.volume = 1;
      video.play?.().catch?.(() => {});
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

/** Hero mount/stop (BlaKats) */
function stopBlakatsHeroVideo() {
  if (blakatsHeroCleanupFn) { try { blakatsHeroCleanupFn(); } catch {} blakatsHeroCleanupFn = null; }
  if (blakatsHeroVideoEl) {
    try { blakatsHeroVideoEl.pause(); blakatsHeroVideoEl.muted = true; blakatsHeroVideoEl.currentTime = 0; } catch {}
  }
  blakatsHeroVideoEl = null;
  blakatsHeroMuteBtnEl = null;
}

function mountLoopingBlaKatsHeroVideo(containerEl, opts) {
  stopBlakatsHeroVideo();
  const { src, start = 0, duration = 13, poster = "", caption = "Preview" } = opts;

  containerEl.innerHTML = `
    <div class="hero-media">
      <video class="hero-video blakats-hero-video" ${poster ? `poster="${poster}"` : ""} muted autoplay playsinline preload="metadata">
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
  const onLoaded = () => { try { video.currentTime = start; } catch {} video.play?.().catch?.(() => {}); };
  const onTimeUpdate = () => {
    if (video.currentTime >= end) { video.currentTime = start; video.play?.().catch?.(() => {}); }
  };

  video.addEventListener("loadedmetadata", onLoaded);
  video.addEventListener("timeupdate", onTimeUpdate);

  containerEl.addEventListener("click", () => video.play?.().catch?.(() => {}));

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentlyMuted = video.muted === true;
    if (currentlyMuted) {
      setBlakatsHeroMuted(false);
      video.volume = 1;
      video.play?.().catch?.(() => {});
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

/** Top-level render */
function renderAll() {
  renderTabs();
  renderPanels();
  $all(".tab").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === activeTabId ? "true" : "false");
  });
}

document.addEventListener("DOMContentLoaded", renderAll);