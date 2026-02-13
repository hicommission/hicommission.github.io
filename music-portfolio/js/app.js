// ============================================================
// music-portfolio/js/app.js
// DROP-IN: 12 items + reliable PayPal link generation via Worker
// Works with <a class="download-btn" target="_blank"> buttons
// ============================================================

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

const TEST_PRICE_USD = "0.10";

// ONLY the 12 MP3s you actually have: blakats_cd_01 ... blakats_cd_12
const items = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const sku = `blakats_cd_${String(n).padStart(2, "0")}`;
  return {
    title: `BlaKats CD ${String(n).padStart(2, "0")}`,
    artist: `BlaKats — CD #${n}`,
    price: TEST_PRICE_USD,
    sku,
    cover: "assets/pop-cover.jpg",
  };
});

function $(sel) {
  return document.querySelector(sel);
}

function renderAll() {
  const container = document.getElementById("tab-pop");
  if (!container) return;

  container.innerHTML = "";

  for (const item of items) {
    const div = document.createElement("div");
    div.className = "music-item";

    // IMPORTANT:
    // - href is a safe placeholder
    // - target=_blank is ok because we intercept click and control the new tab
    div.innerHTML = `
      <img src="${item.cover}" alt="${item.title}">
      <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-artist">${item.artist}</div>
        <div style="font-size:0.9em; opacity:0.8;">$${item.price} • SKU: ${item.sku}</div>
      </div>
      <a class="download-btn"
         href="#"
         target="_blank"
         rel="noopener noreferrer"
         data-sku="${item.sku}"
         data-title="${item.title}"
         data-amount="${item.price}">
        Buy & Download
      </a>
    `;

    container.appendChild(div);
  }
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
  return data; // { url, nonce }
}

function attachClickHandler() {
  // Capture phase helps beat default link navigation reliably.
  document.addEventListener(
    "click",
    async (e) => {
      const link = e.target.closest("a.download-btn");
      if (!link) return;

      e.preventDefault();

      const sku = link.dataset.sku;
      const title = link.dataset.title;
      const amount = link.dataset.amount;

      // Open tab immediately (avoid popup blocker)
      const payTab = window.open("", "_blank", "noopener,noreferrer");
      if (!payTab) {
        alert("Popup blocked. Please allow popups for this site and try again.");
        return;
      }

      // Write immediately so you never see a blank tab
      payTab.document.open();
      payTab.document.write(`
        <!doctype html>
        <html><head><meta charset="utf-8"><title>Preparing PayPal…</title></head>
        <body style="font-family:system-ui;padding:24px">
          <h2>Preparing PayPal…</h2>
          <p>Please wait…</p>
        </body></html>
      `);
      payTab.document.close();

      link.classList.add("disabled");

      try {
        const { url } = await createPayPalLink({ sku, title, amount });
        payTab.location.href = url;
      } catch (err) {
        console.error(err);
        payTab.document.open();
        payTab.document.write(`
          <!doctype html>
          <html><head><meta charset="utf-8"><title>Error</title></head>
          <body style="font-family:system-ui;padding:24px">
            <h2>Payment link failed to generate</h2>
            <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${String(
              err
            )}</pre>
          </body></html>
        `);
        payTab.document.close();
        alert("Payment link failed to generate. Please try again.");
      } finally {
        link.classList.remove("disabled");
      }
    },
    true
  );
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  attachClickHandler();
});