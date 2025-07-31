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

const SONGS = ["Can't Take it Back (Remix)", "Don't Feed the Animals", "Wild Cherry", "Memories","Tonite", "Ask Me Nicely","Pure Heart","Perfect Time for Love", "Hold Me Close","Always Be Frieds","Can't Take it Back", "Monster Love"];
const musicData = {
    pop: Array.from({length: 50}, (_, i) => ({
        //title: `CD song # ${i+1}` + " Don't Feed the Animals",
        title: " Don't Feed the Animals",
        artist: `BlaKats CD $14.99`,
        price: "14.99",
        track:`Song # ${i+1}`,
        song: SONGS[i],
        cover: 'assets/pop-cover.jpg',
        //preview: 'assets/previews/02-Dont-Feed-The-Animals.mp3',
        preview: "assets/previews/"+`${i+1}`+".mp3",
        download: '#'
    })),
    //TODO 1GNM, Chant Down Babylon
    rock: Array.from({length: 50}, (_, i) => ({
        title: `Rock Song ${i+1}`,
        artist: `Rock Artist ${i+1}`,
        price: "1.29",
        cover: 'assets/1GNM.jpeg',
        preview: "assets/previews/"+`${i+1}`+".mp3",
        download: '#'
    })),
    jazz: Array.from({length: 50}, (_, i) => ({
        title: `Jazz Song ${i+1}`,
        artist: `Jazz Artist ${i+1}`,
        price: "1.29",
        cover: 'assets/jazz-cover.jpg',
        download: '#'
    }))/* */
};

const TABS = ['pop', 'rock', 'jazz'];
const ITEMS_PER_LOAD = 12;
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
    //const end = 1; //Math.min(start + ITEMS_PER_LOAD, musicData[tab].length);
    const end = Math.min(start + ITEMS_PER_LOAD, musicData[tab].length);
    for (let i = start; i < end; i++) {
        //const item = musicData[tab][i];
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
             <!--div class="music-title">${item.title}</div-->
        `; */

        div.innerHTML = `
    <img src="${item.cover}" alt="${item.title}">
    <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-title"> ${item.track} ${item.song}</div>
        <div class="music-artist">${item.artist}</div>
        <button class="preview-btn" data-preview="${item.preview}">▶ Preview</button>
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
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 12) {
            renderItems(tab);
        }
    };
}

function getPayPalLink(item) {
    const businessEmail = "gilbertalipui@gmail.com"; // Replace with your PayPal email
    const currency = "USD";
    //const returnUrl = encodeURIComponent("https://yourwebsite.com/thankyou"); // Your thank you/download page
    //const returnUrl = encodeURIComponent("https://hicommission.github.io/DownloadMP3.html"); // Your thank you/download page
    const returnUrl = encodeURIComponent("https://drive.google.com/drive/folders/1FirvgGOIR2FEsi97862xrcv4VaybCRyZ?usp=drive_link"); // Your thank you/download page
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tabs').addEventListener('click', handleTabClick);
    TABS.forEach(tab => {
        renderItems(tab, true);
        handleScroll(tab);
    });
    TABS.slice(1).forEach(tab => {
        document.getElementById(`tab-${tab}`).classList.add('hidden');
    });

    // Global audio preview and stop button
    const audio = document.getElementById('audio-preview');
    const stopBtn = document.getElementById('stop-preview-btn');

    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('preview-btn')) {
            const previewUrl = e.target.getAttribute('data-preview');
            // Set audio source only if needed
            if (audio.src !== window.location.origin + '/' + previewUrl && audio.src !== previewUrl) {
                audio.src = previewUrl;
            }
            // Find all preview buttons
            const allPreviewBtns = document.querySelectorAll('.preview-btn');
            allPreviewBtns.forEach(btn => btn.textContent = '▶ Preview');
            // Toggle play/pause
            if (audio.paused || audio.src !== previewUrl) {
                audio.play();
                e.target.textContent = '⏸ Pause';
                stopBtn.style.display = 'block';
                audio.onended = () => {
                    e.target.textContent = '▶ Preview';
                    stopBtn.style.display = 'none';
                };
            } else {
                audio.pause();
                e.target.textContent = '▶ Preview';
                stopBtn.style.display = 'none';
            }
        }

        // Stop preview button
        if (e.target.id === 'stop-preview-btn') {
            audio.pause();
            audio.currentTime = 0;
            stopBtn.style.display = 'none';
            // Reset all preview buttons' text
            const allPreviewBtns = document.querySelectorAll('.preview-btn');
            allPreviewBtns.forEach(btn => btn.textContent = '▶ Preview');
        }
    });

    // Hide stop button if user navigates away while audio is playing
    audio.addEventListener('pause', () => {
        if (audio.currentTime === 0 || audio.ended) {
            stopBtn.style.display = 'none';
        }
    });
});

