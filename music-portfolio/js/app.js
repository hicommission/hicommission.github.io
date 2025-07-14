// Simulated music data (replace with fetch from server or JSON file in production)
/* const musicData = {
    pop: [
        {
            title: "Pop Song 1",
            artist: "Pop Artist 1",
            cover: "assets/pop-cover.jpg",
            price: 1.29
        },
        // ... more items
    ],
    // ... other genres
}; */


const musicData = {
    pop: Array.from({length: 50}, (_, i) => ({
        title: `CD ${i+1}`,
        artist: `BlaKats CD # ${i+1}`,
        price: "14.99",
        cover: 'assets/pop-cover.jpg',
        download: '#'
    }))/*,
    rock: Array.from({length: 50}, (_, i) => ({
        title: `Rock Song ${i+1}`,
        artist: `Rock Artist ${i+1}`,
        price: "1.29",
        cover: 'assets/rock-cover.jpg',
        download: '#'
    })),
    jazz: Array.from({length: 50}, (_, i) => ({
        title: `Jazz Song ${i+1}`,
        artist: `Jazz Artist ${i+1}`,
        price: "1.29",
        cover: 'assets/jazz-cover.jpg',
        download: '#'
    }))*/
};

const TABS = ['pop', 'rock', 'jazz'];
const ITEMS_PER_LOAD = 10;
let tabState = {
    pop: 0,
    rock: 0,
    jazz: 0
};

function renderItems(tab, reset = false) {
    const container = document.getElementById(`tab-${tab}`);
    if (reset) {
        container.innerHTML = '';
        tabState[tab] = 0;
    }
    const start = tabState[tab];
    const end = 1; //Math.min(start + ITEMS_PER_LOAD, musicData[tab].length);
    for (let i = start; i < end; i++) {
        const item = musicData[tab][i];
        const div = document.createElement('div');
        div.className = 'music-item';
/*         div.innerHTML = `
            <img src="${item.cover}" alt="${item.title}">
            <div class="music-details">
                <div class="music-title">${item.title}</div>
                <div class="music-artist">${item.artist}</div>
            </div>
            <a class="download-btn" href="${item.download}">Download</a>
             <!-- div class="music-price">$${item.price.toFixed(2)}</div-->
        `; */

        div.innerHTML = `
    <img src="${item.cover}" alt="${item.title}">
    <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-artist">${item.artist}</div>
       
    </div>
    <a class="download-btn" href="${getPayPalLink(item)}" target="_blank">Buy & Download</a>
`;

        container.appendChild(div);
    }
    tabState[tab] = end;
}

function handleTabClick(e) {
    if (!e.target.classList.contains('tab')) return;
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    TABS.forEach(tab => {
        document.getElementById(`tab-${tab}`).classList.add('hidden');
    });
    const currentTab = e.target.dataset.tab;
    document.getElementById(`tab-${currentTab}`).classList.remove('hidden');
    renderItems(currentTab, true);
}

function handleScroll(tab) {
    const container = document.getElementById(`tab-${tab}`);
    container.onscroll = function() {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
            renderItems(tab);
        }
    };
}

function getPayPalLink(item) {
    const businessEmail = "gilbertalipui@gmail.com"; // Replace with your PayPal email
    const currency = "USD";
    //const returnUrl = encodeURIComponent("https://yourwebsite.com/thankyou"); // Your thank you/download page
    const returnUrl = encodeURIComponent("https://hicommission.github.io/DownloadMP3.html"); // Your thank you/download page
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${businessEmail}` +
           `&item_name=${encodeURIComponent(item.title)}` +
           `&amount=${item.price}` +
           `&currency_code=${currency}` +
           `&return=${returnUrl}`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tabs').addEventListener('click', handleTabClick);
    TABS.forEach(tab => {
        renderItems(tab, true);
        handleScroll(tab);
    });
    // Show only the first tab by default
    TABS.slice(1).forEach(tab => {
        document.getElementById(`tab-${tab}`).classList.add('hidden');
    });
});
