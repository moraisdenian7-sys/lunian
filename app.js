/* =====================================================
   LUNIAN — OUR PRIVATE UNIVERSE
   FIREBASE + REALTIME CHAT + SYNCHRONIZED PLAYER
===================================================== */

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    getDatabase,
    ref,
    push,
    set,
    onChildAdded,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =====================================================
   1. FIREBASE CONFIGURATION
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCbH6f7hvxPVBcDs6d0Pi96Y7JDwNPkx3M",
    authDomain: "lunian-ea976.firebaseapp.com",
    databaseURL: "https://lunian-ea976-default-rtdb.firebaseio.com",
    projectId: "lunian-ea976",
    storageBucket: "lunian-ea976.firebasestorage.app",
    messagingSenderId: "236370487625",
    appId: "1:236370487625:web:1e18b6976e3acfe5161298",
    measurementId: "G-1TF00W32KW"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);


/* =====================================================
   2. HTML ELEMENTS
===================================================== */

const entranceScreen = document.getElementById("entranceScreen");
const enterButton = document.getElementById("enterButton");
const roomScreen = document.getElementById("roomScreen");

const themeButton = document.getElementById("themeButton");

const videoPlayer = document.getElementById("videoPlayer");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const episodeTitle = document.getElementById("episodeTitle");

const episodesGrid = document.getElementById("episodesGrid");

const youtubeForm = document.getElementById("youtubeForm");
const youtubeInput = document.getElementById("youtubeInput");
const youtubeLoadButton = document.getElementById("youtubeLoadButton");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

const immersiveButton = document.getElementById("immersiveButton");


/* =====================================================
   3. USER IDENTIFICATION
===================================================== */

let currentUser = localStorage.getItem("lunian_user");

if (!currentUser) {
    const selection = prompt(
        "Quem está entrando no LUNIAN?\n\nD = Você\nL = Luquinhas"
    );

    currentUser =
        selection?.trim().toUpperCase() === "L"
            ? "Luquinhas"
            : "Você";

    localStorage.setItem("lunian_user", currentUser);
}

let userId = null;
let chatReady = false;
let playbackReady = false;

let applyingRemotePlayback = false;
let suppressLocalEventsUntil = 0;

let youtubePlayer = null;
let youtubeReady = false;
let youtubeApiPromise = null;

let currentMediaType = null;
let currentMediaSource = null;

let lastPublishedPosition = 0;


/* =====================================================
   4. EPISODES — LUNIAN VIDEO COLLECTION
===================================================== */

const episodes = {
    1: {
        title: "Episódio 01",
        src: "videos/episodio-01.mp4"
    },
    2: {
        title: "Episódio 02",
        src: "videos/episodio-02.mp4"
    },
    3: {
        title: "Episódio 03",
        src: "videos/episodio-03.mp4"
    },
    4: {
        title: "Episódio 04",
        src: "videos/episodio-04.mp4"
    },
    5: {
        title: "Episódio 05",
        src: "videos/episodio-05.mp4"
    },
    6: {
        title: "Episódio 06",
        src: "videos/episodio-06.mp4"
    },
    7: {
        title: "Episódio 07",
        src: "videos/episodio-07.mp4"
    },
    8: {
        title: "Episódio 08",
        src: "videos/episodio-08.mp4"
    }
};


/* =====================================================
   5. ENTRANCE
===================================================== */

enterButton?.addEventListener("click", () => {
    entranceScreen?.classList.add("hidden");
    roomScreen?.classList.remove("hidden");
});


/* =====================================================
   6. NIGHT MODE
===================================================== */

const savedTheme = localStorage.getItem("lunian_theme");

if (savedTheme === "night") {
    document.body.classList.add("night-mode");
}

themeButton?.addEventListener("click", () => {
    document.body.classList.toggle("night-mode");

    const isNight = document.body.classList.contains("night-mode");

    localStorage.setItem(
        "lunian_theme",
        isNight ? "night" : "day"
    );
});


/* =====================================================
   7. FIREBASE AUTHENTICATION
===================================================== */

async function initializeConnection() {
    try {
        const result = await signInAnonymously(auth);

        userId = result.user.uid;

        console.log("LUNIAN conectado ao Firebase.");
        console.log("Participante:", currentUser);
        console.log("Identificação:", userId);

        chatReady = true;
        playbackReady = true;

        initializeChat();
        initializePlayback();

    } catch (error) {
        console.error("Erro na conexão Firebase:", error);

        alert(
            "Não foi possível conectar ao LUNIAN.\n" +
            "Verifique sua conexão e as configurações do Firebase."
        );
    }
}


/* =====================================================
   8. CHAT — SEND MESSAGES
===================================================== */

function initializeChat() {

    const messagesRef = ref(database, "lunian/messages");

    chatForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message || !chatReady) return;

        try {
            await push(messagesRef, {
                text: message,
                sender: currentUser,
                senderId: userId,
                timestamp: serverTimestamp()
            });

            chatInput.value = "";
            chatInput.focus();

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        }
    });


    /* RECEIVE MESSAGES */

    onChildAdded(messagesRef, (snapshot) => {

        const data = snapshot.val();

        if (!data) return;

        displayMessage(data);

    });
}


/* =====================================================
   9. CHAT — DISPLAY MESSAGES
===================================================== */

function displayMessage(data) {

    const messageElement = document.createElement("div");

    const isMine = data.senderId === userId;

    messageElement.classList.add("chat-message");

    messageElement.classList.add(
        isMine ? "sent" : "received"
    );

    const senderElement = document.createElement("span");
    senderElement.classList.add("message-sender");
    senderElement.textContent = data.sender || "Participante";

    const textElement = document.createElement("p");
    textElement.classList.add("message-text");
    textElement.textContent = data.text || "";

    messageElement.appendChild(senderElement);
    messageElement.appendChild(textElement);

    chatMessages?.appendChild(messageElement);

    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}


/* =====================================================
   10. YOUTUBE API
===================================================== */

function loadYouTubeAPI() {

    if (youtubeApiPromise) {
        return youtubeApiPromise;
    }

    youtubeApiPromise = new Promise((resolve, reject) => {

        if (window.YT?.Player) {
            resolve(window.YT);
            return;
        }

        const script = document.createElement("script");

        script.src = "https://www.youtube.com/iframe_api";

        script.onerror = () => {
            youtubeApiPromise = null;
            reject(new Error("Não foi possível carregar o YouTube."));
        };

        document.head.appendChild(script);

        const previousCallback = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = () => {
            previousCallback?.();
            resolve(window.YT);
        };

        setTimeout(() => {
            if (!window.YT?.Player) {
                reject(new Error("Tempo esgotado ao carregar o YouTube."));
            }
        }, 15000);
    });

    return youtubeApiPromise;
}


/* =====================================================
   11. EXTRACT YOUTUBE ID
===================================================== */

function extractYouTubeId(url) {

    try {

        const parsed = new URL(url);

        let id = null;

        if (parsed.hostname.includes("youtu.be")) {
            id = parsed.pathname.slice(1);
        }

        else if (parsed.searchParams.has("v")) {
            id = parsed.searchParams.get("v");
        }

        else {
            const match = parsed.pathname.match(
                /\/(?:embed|shorts|live)\/([^/?]+)/
            );

            if (match) {
                id = match[1];
            }
        }

        return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
            ? id
            : null;

    } catch {
        return null;
    }
}


/* =====================================================
   12. CREATE YOUTUBE PLAYER
===================================================== */

async function createYouTubePlayer(videoId, shouldPublish = true) {

    try {

        await loadYouTubeAPI();

        const container = document.querySelector(".video-container");

        if (!container) return;

        let host = document.getElementById("youtubePlayerHost");

        if (!host) {
            host = document.createElement("div");
            host.id = "youtubePlayerHost";

            container.appendChild(host);
        }

        videoPlayer?.classList.add("hidden");

        if (videoPlaceholder) {
            videoPlaceholder.classList.add("hidden");
        }

        if (youtubePlayer) {

            if (youtubeReady) {
                youtubePlayer.loadVideoById(videoId);
            } else {
                youtubePlayer.destroy();
                youtubePlayer = null;
            }

        }

        if (!youtubePlayer) {

            youtubeReady = false;

            youtubePlayer = new YT.Player("youtubePlayerHost", {

                videoId: videoId,

                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    rel: 0,
                    playsinline: 1
                },

                events: {

                    onReady: () => {

                        youtubeReady = true;

                        if (shouldPublish) {
                            publishPlayback({
                                type: "youtube",
                                source: videoId,
                                action: "play",
                                position: 0
                            });
                        }

                    },

                    onStateChange: (event) => {

                        if (applyingRemotePlayback) return;

                        if (Date.now() < suppressLocalEventsUntil) return;

                        if (!shouldPublish || !youtubeReady) return;

                        if (event.data === YT.PlayerState.PLAYING) {

                            publishPlayback({
                                type: "youtube",
                                source: videoId,
                                action: "play",
                                position: youtubePlayer.getCurrentTime()
                            });

                        }

                        else if (event.data === YT.PlayerState.PAUSED) {

                            publishPlayback({
                                type: "youtube",
                                source: videoId,
                                action: "pause",
                                position: youtubePlayer.getCurrentTime()
                            });

                        }
                    }
                }
            });
        }

        currentMediaType = "youtube";
        currentMediaSource = videoId;

        if (episodeTitle) {
            episodeTitle.textContent = "YouTube — Sessão compartilhada";
        }

    } catch (error) {

        console.error("Erro no player YouTube:", error);

        alert("Não foi possível carregar o player do YouTube.");
    }
}


/* =====================================================
   13. YOUTUBE FORM
===================================================== */

youtubeForm?.addEventListener("submit", async (event) => {

    event.preventDefault();

    const url = youtubeInput.value.trim();

    const videoId = extractYouTubeId(url);

    if (!videoId) {
        alert("Insira um link válido do YouTube.");
        return;
    }

    await createYouTubePlayer(videoId, true);

    youtubeInput.value = "";
});


/* =====================================================
   14. LOCAL EPISODES
===================================================== */

function loadLocalEpisode(number, shouldPublish = true) {

    const episode = episodes[number];

    if (!episode || !videoPlayer) return;

    currentMediaType = "local";
    currentMediaSource = episode.src;

    if (youtubePlayer) {
        youtubePlayer.pauseVideo();
    }

    const host = document.getElementById("youtubePlayerHost");

    if (host) {
        host.classList.add("hidden");
    }

    videoPlayer.classList.remove("hidden");

    if (videoPlaceholder) {
        videoPlaceholder.classList.add("hidden");
    }

    episodeTitle.textContent = episode.title;

    videoPlayer.src = episode.src;

    videoPlayer.load();

    if (shouldPublish) {

        publishPlayback({
            type: "local",
            source: episode.src,
            action: "load",
            position: 0
        });

    }

    videoPlayer.onloadedmetadata = async () => {

        if (shouldPublish) {

            try {
                await videoPlayer.play();
            } catch (error) {
                console.warn("Reprodução aguardando interação:", error);
            }

        }

    };
}


/* =====================================================
   15. EPISODE SELECTION
===================================================== */

episodesGrid?.addEventListener("click", (event) => {

    const episodeCard = event.target.closest("[data-episode]");

    if (!episodeCard) return;

    const number = Number(episodeCard.dataset.episode);

    loadLocalEpisode(number);

});


/* =====================================================
   16. PLAYBACK — PUBLISH STATE
===================================================== */

async function publishPlayback(state) {

    if (!playbackReady || !userId || applyingRemotePlayback) return;

    if (Date.now() < suppressLocalEventsUntil) return;

    try {

        await set(ref(database, "lunian/playback"), {

            ...state,

            senderId: userId,
            sender: currentUser,
            updatedAt: serverTimestamp()

        });

    } catch (error) {

        console.error("Erro ao sincronizar reprodução:", error);

    }
}


/* =====================================================
   17. PLAYBACK — LOCAL VIDEO EVENTS
===================================================== */

videoPlayer?.addEventListener("play", () => {

    if (applyingRemotePlayback) return;

    if (Date.now() < suppressLocalEventsUntil) return;

    if (currentMediaType !== "local") return;

    publishPlayback({
        type: "local",
        source: currentMediaSource,
        action: "play",
        position: videoPlayer.currentTime
    });

});


videoPlayer?.addEventListener("pause", () => {

    if (applyingRemotePlayback) return;

    if (Date.now() < suppressLocalEventsUntil) return;

    if (currentMediaType !== "local") return;

    publishPlayback({
        type: "local",
        source: currentMediaSource,
        action: "pause",
        position: videoPlayer.currentTime
    });

});


videoPlayer?.addEventListener("seeked", () => {

    if (applyingRemotePlayback) return;

    if (Date.now() < suppressLocalEventsUntil) return;

    if (currentMediaType !== "local") return;

    publishPlayback({
        type: "local",
        source: currentMediaSource,
        action: videoPlayer.paused ? "pause" : "play",
        position: videoPlayer.currentTime
    });

});


/* =====================================================
   18. PLAYBACK — RECEIVE STATE
===================================================== */

function initializePlayback() {

    const playbackRef = ref(database, "lunian/playback");

    onValue(playbackRef, async (snapshot) => {

        const state = snapshot.val();

        if (!state) return;

        if (state.senderId === userId) return;

        await applyRemotePlayback(state);

    });

}


/* =====================================================
   19. PLAYBACK — APPLY REMOTE STATE
===================================================== */

async function applyRemotePlayback(state) {

    if (!state || !state.type || !state.source) return;

    applyingRemotePlayback = true;

    suppressLocalEventsUntil = Date.now() + 1800;

    try {

        const isDifferentMedia =
            currentMediaType !== state.type ||
            currentMediaSource !== state.source;

        if (state.type === "local") {

            const episodeNumber = Object.keys(episodes).find(
                number => episodes[number].src === state.source
            );

            if (!episodeNumber) return;

            if (isDifferentMedia) {

                currentMediaType = "local";
                currentMediaSource = state.source;

                if (youtubePlayer && youtubeReady) {
                    youtubePlayer.pauseVideo();
                }

                const host = document.getElementById("youtubePlayerHost");

                if (host) host.classList.add("hidden");

                videoPlayer.classList.remove("hidden");

                if (videoPlaceholder) {
                    videoPlaceholder.classList.add("hidden");
                }

                episodeTitle.textContent = episodes[episodeNumber].title;

                videoPlayer.src = state.source;
                videoPlayer.load();

                await new Promise((resolve) => {

                    videoPlayer.addEventListener(
                        "loadedmetadata",
                        resolve,
                        { once: true }
                    );

                });

            }

            await syncRemotePosition(state.position || 0, "local");

            if (state.action === "play") {

                try {
                    await videoPlayer.play();
                } catch (error) {
                    console.warn("O navegador bloqueou a reprodução automática.");
                }

            }

            else if (state.action === "pause") {
                videoPlayer.pause();
            }

        }


        else if (state.type === "youtube") {

            if (isDifferentMedia) {

                await createYouTubePlayer(state.source, false);

            }

            if (!youtubeReady || !youtubePlayer) return;

            await syncRemotePosition(state.position || 0, "youtube");

            if (state.action === "play") {
                youtubePlayer.playVideo();
            }

            else if (state.action === "pause") {
                youtubePlayer.pauseVideo();
            }

        }

    } catch (error) {

        console.error("Erro ao aplicar sincronização:", error);

    } finally {

        setTimeout(() => {
            applyingRemotePlayback = false;
        }, 500);

    }
}


/* =====================================================
   20. POSITION SYNCHRONIZATION
===================================================== */

async function syncRemotePosition(position, type) {

    if (!Number.isFinite(position)) return;

    if (type === "local") {

        const difference = Math.abs(
            videoPlayer.currentTime - position
        );

        if (difference > 2) {
            videoPlayer.currentTime = position;
        }

    }

    else if (type === "youtube" && youtubeReady && youtubePlayer) {

        const difference = Math.abs(
            youtubePlayer.getCurrentTime() - position
        );

        if (difference > 2) {
            youtubePlayer.seekTo(position, true);
        }

    }

}


/* =====================================================
   21. PERIODIC POSITION UPDATES
===================================================== */

setInterval(() => {

    if (!playbackReady || applyingRemotePlayback) return;

    if (Date.now() < suppressLocalEventsUntil) return;

    if (currentMediaType === "local" && videoPlayer && !videoPlayer.paused) {

        const position = videoPlayer.currentTime;

        if (Math.abs(position - lastPublishedPosition) >= 4) {

            lastPublishedPosition = position;

            publishPlayback({
                type: "local",
                source: currentMediaSource,
                action: "play",
                position
            });

        }

    }

    else if (
        currentMediaType === "youtube" &&
        youtubeReady &&
        youtubePlayer &&
        youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING
    ) {

        const position = youtubePlayer.getCurrentTime();

        if (Math.abs(position - lastPublishedPosition) >= 4) {

            lastPublishedPosition = position;

            publishPlayback({
                type: "youtube",
                source: currentMediaSource,
                action: "play",
                position
            });

        }

    }

}, 5000);


/* =====================================================
   22. IMMERSIVE MODE
===================================================== */

immersiveButton?.addEventListener("click", async () => {

    const cinemaConsole = document.querySelector(".cinema-console");

    if (!cinemaConsole) return;

    try {

        if (!document.fullscreenElement) {

            await cinemaConsole.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.error("Erro ao abrir tela imersiva:", error);

    }

});


/* =====================================================
   23. START LUNIAN
===================================================== */

initializeConnection();