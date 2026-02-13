// ============================================================
// music-portfolio/js/app.js
// FULL DROP-IN: 12 items, real song names, thumbnail hover + lightbox
// Uses Cloudflare Worker to generate PayPal link (NO popups, SAME TAB)
//
// NEW:
//  - Instant “flash” auto-download on the /pay/return page (browser-only)
//  - Removes “Debug: nonce=...” from the /pay/return page (best-effort hide)
//  - If nonce is present in URL, automatically redirects to:
//      https://cliquetraxx.com/download?token=<nonce>
//
// IMPORTANT:
//  - This works even if the Worker return page still shows the debug line,
//    because we hide it on the client and immediately redirect.
//  - If you want the Worker to stop emitting debug server-side, that’s a
//    separate Worker change. This file handles it client-side.
// ============================================================

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;
const PRICE_USD = "0.10";

// Auto-download timing (ms). Browsers do not reliably support sub-1000ms
// setInterval/timeout accuracy, and 0.5ms is not meaningful on the web.
// Use 0 for "as soon as possible".
const AUTO_DOWNLOAD_DELAY_MS = 0; // set to 500 or 1000 if you want a brief flash

// 12 REAL track titles (from your screenshot)
const TRACKS = [
  { sku: "blakats_cd_01", trackNo: "01", title: "Can't Take It Back (Remix)" },
  { sku: "blakats_cd_02", trackNo: "02", title: "Don't Feed The Animals" },
  { sku: "blakats_cd_03", trackNo: "03", title: "Wild Cherry" },
  { sku: "blakats_cd_04", trackNo: "04", title: "Memories" },
  { sku: "blakats_cd_05", trackNo: "05", title: "Tonite" },
  { sku: "blakats_cd_06", trackNo: "06", title: "Ask Me Nicely" },
  { sku: "blakats_cd_07", trackNo: "07", title: "Pure Heart" },
  { sku: "blakats_cd_08", trackNo: "08", title: "Perfect Time For Love" },
  { sku: "blakats_cd_09", trackNo: "09", title: "Hold Me Close" },
  { sku: "blakats_cd_10", trackNo: "10", title: "Always Be Friends" },
  { sku: "blakats_cd_11", trackNo: "11", title: "Can't Take It Back" },
  { sku: "blakats_cd_12", trackNo: "12", title: "Monster Love" },
];

// Same cover is fine (as requested)
function coverFor(track) {
  return { thumb: "assets/pop-cover.jpg", full: "assets/pop-cover.jpg" };
}

// ---------- AUTO-DOWNLOAD on /pay/return ----------
function runAutoDownloadIfOnReturnPage() {
  // This file is used site-wide. Only run on the return page.
  const path = window.location.pathname || "";
  if (!path.endsWith("/pay/return")) return;

  const url = new URL(window.location.href);
  const nonce = url.searchParams.get("nonce");

  // Remove/hide debug line immediately (best-effort, client-side)
  removeDebugNonceLine();

  // If we have nonce, redirect straight to download.
  if (nonce) {
    setTimeout(() => {
      window.location.replace(`${CLOUDFLARE_BASE}/download?token=${encodeURIComponent(nonce)}`);
    }, Math.max(0, AUTO_DOWNLOAD_DELAY_MS));
    return;
  }

  // If no nonce, do nothing (Worker will handle tx-based flow / processing page)
}

function removeDebugNonceLine() {
  // 1) Nuke any line containing "Debug:" (common case)
  // 2) Also hide any element that contains "nonce=" just in case.
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const n of nodes) {
      const t = (n.nodeValue || "").trim();
      if (!t) continue;

      if (t.includes("Debug:") || t.includes("nonce=")) {
        const el = n.parentElement;
        if (el) {
          // Hide the whole line/container
          el.style.display = "none";
        } else {
          n.nodeValue = "";
        }
      }
    }
  } catch {}
}

// ---------- UI helpers ----------
function injectStyles() {
  const css = `
  /* Hover effect for thumbnail */
  .music-item img.thumb {
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
    border-radius: 10px;
  }
  .music-item img.thumb:hover {
    transform: scale(1.04);
    filter: brightness(1.03);
    box-shadow: 0 10px 26px rgba(0,0,0,0.22);
  }

  /* Lightbox */
  .lightbox-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.78);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 22px;
  }
  .lightbox-backdrop.open { display: flex; }

  .lightbox-panel {
    position: relative;
    max-width: min(1000px, 96vw);
    max-height: 92vh;
  }
  .lightbox-panel img {
    max-width: 100%;
    max-height: 92vh;
    display: block;
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  .lightbox-close {
    position: absolute;
    top: -14px;
    right: -14px;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-size: 20px;
    line-height: 38px;
    background: #fff;
    box-shadow: 0 10px 26px rgba(0,0,0,0.25);
  }

  /* Button busy state */
  a.download-btn[data-busy="1"] {
    pointer-events: none;
    opacity: 0.6;
  }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

function ensureLightbox() {
  let lb = document.getElementById("lightbox");
  if (lb) return lb;

  lb = document.createElement("div");
  lb.id = "lightbox";
  lb.className = "lightbox-backdrop";
  lb.innerHTML = `
    <div class="lightbox-panel" role="dialog" aria-modal="true">
      <button class="lightbox-close" aria-label="Close">✕</button>
      <img alt="Full image"/>
    </div>
  `;
  document.body.appendChild(lb);

  // Close on backdrop click
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Close on button click
  lb.querySelector(".lightbox-close").addEventListener("click", closeLightbox);

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  return lb;
}

function openLightbox(src, alt) {
  const lb = ensureLightbox();
  const img = lb.querySelector("img");
  img.src = src;
  img.alt = alt || "Full image";
  lb.classList.add("open");
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("open");
  const img = lb.querySelector("img");
  if (img) img.src = "";
}

async function createPayPalLink({ sku, title, amount }) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, title, amount }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`create failed: HTTP ${res.status} ${txt}`.trim());
  }

  const data = await res.json();
  if (!data?.url) throw new Error("create failed: missing url");
  return data.url;
}

function renderAll() {
  // Your page uses tab-pop; if not found, fallback to a generic container
  const container =
    document.getElementById("tab-pop") ||
    document.getElementById("items") ||
    document.querySelector(".music-list");

  if (!container) return;

  container.innerHTML = "";

  for (const track of TRACKS) {
    const cover = coverFor(track);

    const div = document.createElement("div");
    div.className = "music-item";

    div.innerHTML = `
      <img class="thumb" src="${cover.thumb}" alt="${track.title}" data-full="${cover.full}">
      <div class="music-details">
        <div class="music-title">${track.trackNo}. ${track.title}</div>
        <div class="music-artist">BlaKats</div>
        <div style="font-size:0.9em; opacity:0.8;">$${PRICE_USD}</div>
      </div>

      <a class="download-btn"
         href="#"
         rel="nofollow"
         data-sku="${track.sku}"
         data-title="${track.title}"
         data-amount="${PRICE_USD}">
        Buy & Download
      </a>
    `;

    container.appendChild(div);
  }
}

function attachHandlers() {
  // Thumbnail click -> lightbox
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img.thumb");
    if (!img) return;

    const full = img.dataset.full || img.src;
    const alt = img.getAttribute("alt") || "Full image";
    openLightbox(full, alt);
  });

  // Buy & Download click -> create paypal link -> same tab navigation
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("a.download-btn");
    if (!btn) return;

    e.preventDefault();
    if (btn.dataset.busy === "1") return;

    btn.dataset.busy = "1";
    const originalText = btn.textContent;
    btn.textContent = "Loading…";

    const sku = btn.dataset.sku;
    const title = btn.dataset.title;
    const amount = btn.dataset.amount;

    try {
      const paypalUrl = await createPayPalLink({ sku, title, amount });
      window.location.href = paypalUrl; // SAME TAB (no popup blockers)
    } catch (err) {
      console.error(err);
      alert("Payment link failed to generate. Please try again.");
      btn.dataset.busy = "0";
      btn.textContent = originalText;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  injectStyles();
  ensureLightbox();

  // Run “instant flash download” logic if we are on /pay/return
  runAutoDownloadIfOnReturnPage();

  // Render the catalog page if the container exists
  renderAll();
  attachHandlers();
});