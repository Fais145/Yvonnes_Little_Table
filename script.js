/* -------------------------
   Loading screen (preload)
   ------------------------- */
function preloadImages(srcList) {
  return Promise.all(
    srcList.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

window.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("loading");

  const assets = [
    "Assets/Table.png",
    "Assets/Ornament.png",
    "Assets/Badminton.png",
    "Assets/Cookie.png",
    "Assets/Letter.png",
    "Assets/Lavender.png",
    "Assets/Note.png",
    "Assets/Padlock.png",
    "Assets/MusicBox_On.png",
    "Assets/MusicBox_Off.png",
  ];

  const MIN_MS = 650;

  const start = performance.now();
  await Promise.all([
  preloadImages(assets),
  preloadAudio("Assets/SFX/cosy.mp3")
]);


  const elapsed = performance.now() - start;
  if (elapsed < MIN_MS) await sleep(MIN_MS - elapsed);

  loading?.classList.add("hidden");
});

/* -------------------------
   Notes + lock progression
   ------------------------- */
const overlay = document.getElementById("noteOverlay");
const noteText = document.getElementById("noteText");
const closeBtn = document.getElementById("noteClose");

const letterWrap = document.querySelector(".letterWrap");
const lockCounterEl = document.getElementById("lockCounter");

const REQUIRED_KEYS = ["ornament", "badminton", "cookie", "lavender"];
let remaining = REQUIRED_KEYS.length; // starts at 4
const unlockedItems = new Set(); // tracks unique item clicks

const NOTES = {
  ornament:
    "You've made christmas one of my favourite times of the year.\nI look back on our first one as one of my favourite weeks and it makes me yearn so much. I truly loved spending every day with you without a care in the world.\n\n This year was even better getting to be with you and your family. Here's to many more years of presents and mahjong together! <3",
  badminton:
    "Even though badminton is something we've only recently started doing together I love waking up in the morning and playing with you.\n\n It makes me think of all the future Sundays we'll have together and how much more complete and happy I feel with you in my life.",
  cookie:
    "I just wanted to say thank you for all the times you've baked for me.\nI'm obsessed with everything you've ever made and I'm constantly thinking about the next thing you'll make.\n\n You put so much love into everything you do and I feel so lucky to be on the receiving end of it all <3 I hope we can bake together soon!",
  lavender:
    "I still think back to the lavender field so often. I felt like I was in a music video with you. I want our relationship to always feel like that and I hope we can go back there again one day.\n\n Lavender reminds me of you to this day. My soulmate!",
  letter:
    "Yvonne, my darling.\nYou are the love of my life. There's no other way to put it.\nI'm always yearning over our relationship.\n You're strong, smart, funny and everything I've ever wanted in a person.Thank you for being mine and making me feel so loved.\nI want to make you the happiest girl in the world and so, I have a very important question to ask you..\nWill you be my valentine?",
};

// -------------------------
// SFX manager (best practice)
// -------------------------
function createSfx(src, { volume = 0.7 } = {}) {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = volume;

  return {
    play() {
      // clone for overlap (rapid clicks)
      const b = a.cloneNode(true);
      b.volume = a.volume;
      b.play().catch(() => {});
    },
    setVolume(v) {
      a.volume = Math.max(0, Math.min(1, v));
    }
  };
}

const SFX = {
  click: createSfx("Assets/SFX/ClickSound.wav", { volume: 0.6 }),
  // close: createSfx("Assets/SFX/close.mp3", { volume: 0.6 }),
  shake: createSfx("Assets/SFX/shake.mp3", { volume: 0.55 }),
  unlock: createSfx("Assets/SFX/upgrade.mp3", { volume: 0.75 }),
};

function openNote(key) {
  if (!overlay || !noteText) return;
  noteText.innerText = NOTES[key] ?? "❤️"; // innerText keeps your \n line breaks
  SFX.click.play();
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

function closeNote() {
  if (!overlay) return;
  SFX.click.play();
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

function triggerLetterShake() {
  if (!letterWrap) return;
  letterWrap.classList.remove("shake");
  // restart animation
  void letterWrap.offsetWidth;
  letterWrap.classList.add("shake");
}

function updateCounter() {
  if (!lockCounterEl) return;
  lockCounterEl.textContent = String(remaining);
}

function unlockLetter() {
  if (!letterWrap) return;

  // start fade animation (CSS handles .unlocking)
  letterWrap.classList.remove("locked");
  letterWrap.classList.add("unlocking");

  // after fade completes, remove lock UI and mark unlocked
  setTimeout(() => {
    letterWrap.classList.remove("unlocking");
    letterWrap.classList.add("unlocked");

    const lockImg = letterWrap.querySelector(".letterLock");
    lockImg?.remove();
    lockCounterEl?.remove();
  }, 650);
}

function isLetterLocked() {
  return remaining > 0;
}

/**
 * Determine the "key" for a clicked element.
 * - For letterWrap: uses data-key="letter"
 * - For others: checks class names (ornament/badminton/cookie/lavender)
 */
function getKeyFromElement(el) {
  const dataKey = el.dataset?.key;
  if (dataKey) return dataKey;

  const allKeys = [...REQUIRED_KEYS, "letter"];
  return allKeys.find((k) => el.classList.contains(k)) ?? null;
}

/**
 * Handle progression:
 * - Only decrement when a REQUIRED item is clicked for the first time.
 * - Shake letter each time we decrement.
 * - Unlock letter when remaining hits 0.
 */
function handleProgression(key) {
  if (!REQUIRED_KEYS.includes(key)) return;

  if (unlockedItems.has(key)) return; // already counted
  unlockedItems.add(key);

  remaining = Math.max(0, remaining - 1);
  updateCounter();
  triggerLetterShake();
  SFX.shake.play();

  if (remaining === 0) {
    unlockLetter();
    SFX.unlock.play();
  }
}

/* -------------------------
   Click bindings
   ------------------------- */

// Click any prop OR the letterWrap
document.querySelectorAll(".prop").forEach((el) => {
  // skip decorative items if you add them later
  if (el.classList.contains("candle")) return;
  if (el.classList.contains("musicbox")) return;

  el.addEventListener("click", () => {
    const key = getKeyFromElement(el);
    if (!key) return;

    // clicking the letter while locked -> shake only (no note)
    if (key === "letter" && isLetterLocked()) {
      triggerLetterShake();
      return;
    }

    // decrement progression if it’s one of the required items
    handleProgression(key);

    // open note for this item
    openNote(key);
  });
});

/* -------------------------
   Close modal events
   ------------------------- */
closeBtn?.addEventListener("click", closeNote);

// Optional: click outside closes. If you want ONLY the X, delete this.
overlay?.addEventListener("click", (e) => {
  if (e.target === overlay) closeNote();
});

// Optional: Esc closes. If you want ONLY the X, delete this.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
    closeNote();
  }
});

function preloadAudio(src) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;

    audio.addEventListener("canplaythrough", () => resolve(), { once: true });
    audio.addEventListener("error", () => {
      console.error("preloadAudio error for:", src, audio.error);
      resolve();
    }, { once: true });

    audio.load();
  });
}

// -------------------------
// Background music (controlled by the music box)
// -------------------------
const bgm = new Audio();
bgm.src = "Assets/SFX/cosy.mp3";
bgm.loop = true;
bgm.volume = 0.35;
bgm.preload = "auto";
bgm.load();

let bgmEnabled = false;

const musicboxEl = document.getElementById("musicbox");
const MUSICBOX_ON_SRC = "Assets/MusicBox_On.png";
const MUSICBOX_OFF_SRC = "Assets/MusicBox_Off.png";

async function setBgmEnabled(on) {
  if (!musicboxEl) {
    console.warn("musicbox element not found (id='musicbox')");
    return;
  }

  if (on) {
    try {
      await bgm.play(); // must be inside a click
      bgmEnabled = true;
      musicboxEl.src = MUSICBOX_ON_SRC;
      musicboxEl.alt = "Music box (on)";
      musicboxEl.classList.add("on");
    } catch (e) {
      console.error("BGM play failed:", e);
      bgmEnabled = false;
      musicboxEl.src = MUSICBOX_OFF_SRC;
      musicboxEl.alt = "Music box (off)";
      musicboxEl.classList.remove("on");
    }
  } else {
    bgmEnabled = false;
    bgm.pause();
    bgm.currentTime = 0;

    musicboxEl.src = MUSICBOX_OFF_SRC;
    musicboxEl.alt = "Music box (off)";
    musicboxEl.classList.remove("on");
  }
}

musicboxEl?.addEventListener("click", (e) => {
  e.stopPropagation();
  setBgmEnabled(!bgmEnabled);
});

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", async () => {
  SFX?.click?.play?.();

  // Fade start screen
  startScreen.classList.add("fadeOut");

  // Small emotional pause
  await new Promise(r => setTimeout(r, 450));

  // Hide it fully
  startScreen.classList.add("hidden");

  // Start music *after* the transition
  setBgmEnabled(true);
});

