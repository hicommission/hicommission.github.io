(() => {
  // ============================
  // CONFIG
  // ============================
  const CLOUDFLARE_BASE = "https://cliquetraxx.com";
  const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

  // 30s preview behavior
  const PREVIEW_MAX_SECONDS = 30;

  // Your 12 tracks (EDIT TITLES if needed)
  const TRACKS = [
    { sku: "blakats_cd_01", title: "01. Can't Take It Back (Remix)", artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_02", title: "02. Don't Feed The Animals",     artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_03", title: "03. Wild Cherry",                artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_04", title: "04. Memories",                   artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_05", title: "05. Tonite",                     artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_06", title: "06. Ask Me Nicely",              artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_07", title: "07. Pure Heart",                 artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_08", title: "08. Perfect Time For Love",      artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_09", title: "09. Hold Me Close",              artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_10", title: "10. (Track 10)",                 artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_11", title: "11. (Track 11)",                 artist: "BlaKats", amount: "0.10" },
    { sku: "blakats_cd_12", title: "12. (Track 12)",                 artist: "BlaKats", amount: "0.10" },
  ];

  // Preview mp3 location
  function previewUrlForSku(sku) {
    return `assets/previews/${sku}_preview.mp3`;
  }

  // Optional: cover image (if you have one per track, swap this function)
  function coverForSku(_sku) {
    // If you have a single cover thumbnail, point it here. Otherwise use your current one.
    // Keeping a safe default path that already exists in your repo is best.
    return "assets/pop-cover.jpg"; // change if you want
  }

  // ============================
  // PAYPAL CREATE
  // ============================
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

  // ============================
  // RENDER
  // ============================
  const tabPop = document.getElementById("tab-pop");

  function render() {
    if (!tabPop) return;

    tabPop.innerHTML = `
      <div class="track-list">
        ${TRACKS.map((t) => trackRowHTML(t)).join("")}
      </div>
    `;
  }

  function trackRowHTML(track) {
    const bars = Array.from({ length: 24 })
      .map((_, i) => `<span class="bar" data-i="${i}"></span>`)
      .join("");

    return `
      <div class="track-row" data-sku="${track.sku}">
        <div class="track-left">
          <img class="track-cover" src="${coverForSku(track.sku)}" alt="cover"/>
          <div class="track-meta">
            <div class="track-title">${escapeHtml(track.title)}</div>
            <div class="track-artist">${escapeHtml(track.artist)}</div>
            <div class="track-price">$${escapeHtml(track.amount)}</div>
          </div>
        </div>

        <div class="track-preview">
          <div class="preview-wrap">
            <button class="preview-btn"
              type="button"
              data-audio="${previewUrlForSku(track.sku)}"
              aria-label="Preview ${escapeHtml(track.title)}">
              ▶ Preview
            </button>

            <div class="wavebox" aria-hidden="true">
              ${bars}
            </div>

            <div class="preview-time" aria-hidden="true">0:00 / 0:30</div>
          </div>
        </div>

        <div class="track-right">
          <button class="buy-btn" type="button" data-sku="${track.sku}">
            Buy &amp; Download
          </button>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ============================
  // PREVIEW PLAYER (single shared audio)
  // ============================
  const audio = new Audio();
  audio.preload = "metadata";

  let activeRow = null;          // .track-row element
  let tickTimer = null;          // interval for updating UI
  let stopTimer = null;          // timeout to stop at 30s

  function stopPreview() {
    clearInterval(tickTimer);
    tickTimer = null;
    clearTimeout(stopTimer);
    stopTimer = null;

    audio.pause();
    audio.currentTime = 0;

    if (activeRow) {
      setRowPlaying(activeRow, false);
      setRowTime(activeRow, 0);
    }
    activeRow = null;
  }

  function setRowPlaying(rowEl, playing) {
    const btn = rowEl.querySelector(".preview-btn");
    const wave = rowEl.querySelector(".wavebox");
    if (!btn || !wave) return;

    btn.textContent = playing ? "⏸ Pause" : "▶ Preview";
    rowEl.classList.toggle("is-playing", playing);
    wave.classList.toggle("is-active", playing);
  }

  function setRowTime(rowEl, seconds) {
    const timeEl = rowEl.querySelector(".preview-time");
    if (!timeEl) return;
    const clamped = Math.max(0, Math.min(PREVIEW_MAX_SECONDS, seconds));
    timeEl.textContent = `${fmtTime(clamped)} / 0:30`;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function startUIUpdater(rowEl) {
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (!activeRow) return;
      setRowTime(activeRow, audio.currentTime || 0);
    }, 200);
  }

  function armAutoStop() {
    clearTimeout(stopTimer);
    // Stop exactly at PREVIEW_MAX_SECONDS relative to now
    const remaining = Math.max(0, (PREVIEW_MAX_SECONDS - (audio.currentTime || 0)) * 1000);
    stopTimer = setTimeout(() => stopPreview(), remaining);
  }

  async function togglePreview(rowEl, audioUrl) {
    // If clicking same row and currently playing -> pause
    if (activeRow === rowEl && !audio.paused) {
      audio.pause();
      setRowPlaying(rowEl, false);
      clearInterval(tickTimer);
      tickTimer = null;
      clearTimeout(stopTimer);
      stopTimer = null;
      return;
    }

    // If clicking same row but paused -> resume
    if (activeRow === rowEl && audio.paused) {
      await audio.play().catch(() => {});
      setRowPlaying(rowEl, true);
      startUIUpdater(rowEl);
      armAutoStop();
      return;
    }

    // Switching rows -> stop prior, start new
    stopPreview();
    activeRow = rowEl;

    audio.src = audioUrl;
    audio.currentTime = 0;

    // Update UI immediately
    setRowTime(rowEl, 0);
    setRowPlaying(rowEl, true);

    // Play
    await audio.play().catch((e) => {
      console.error("Preview play failed:", e);
      setRowPlaying(rowEl, false);
      activeRow = null;
    });

    if (activeRow) {
      startUIUpdater(rowEl);
      armAutoStop();
    }
  }

  audio.addEventListener("ended", () => {
    stopPreview();
  });

  // ============================
  // EVENTS
  // ============================
  document.addEventListener("click", async (e) => {
    const previewBtn = e.target.closest(".preview-btn");
    if (previewBtn) {
      const row = previewBtn.closest(".track-row");
      const url = previewBtn.getAttribute("data-audio");
      if (row && url) {
        await togglePreview(row, url);
      }
      return;
    }

    const buyBtn = e.target.closest(".buy-btn");
    if (buyBtn) {
      const sku = buyBtn.getAttribute("data-sku");
      const track = TRACKS.find((t) => t.sku === sku);
      if (!track) return;

      // Prevent preview audio continuing during checkout
      stopPreview();

      buyBtn.disabled = true;
      buyBtn.textContent = "Loading…";

      try {
        const paypalUrl = await createPayPalLink({
          sku: track.sku,
          title: track.title,
          amount: track.amount,
        });
        window.location.href = paypalUrl;
      } catch (err) {
        console.error(err);
        buyBtn.disabled = false;
        buyBtn.textContent = "Buy & Download";
        alert("Payment link failed to generate. Please try again.");
      }
    }
  });

  // Tabs (kept simple)
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;

    // stop audio if switching
    stopPreview();

    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const name = tab.getAttribute("data-tab");
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    const panel = document.getElementById(`tab-${name}`);
    if (panel) panel.classList.remove("hidden");
  });

  // ============================
  // INIT
  // ============================
  render();
})();