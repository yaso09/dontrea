document.querySelectorAll("[data-copy]").forEach((item) => {
  let toastTimer;
  const copy = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(item.dataset.copy);
      copied = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = item.dataset.copy;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      copied = document.execCommand("copy");
      field.remove();
    }
    const toast = item.querySelector(".copy-toast");
    if (!toast) return;
    toast.textContent = window.DontreaI18n?.t(copied ? "copied" : "copyFailed") || (copied ? "Kopyalandı" : "Kopyalanamadı");
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1500);
  };
  item.addEventListener("click", copy);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      copy();
    }
  });
});

const topbar = document.querySelector(".topbar");
let previousScrollY = window.scrollY;
let downDistance = 0;
let upDistance = 0;
window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const movement = currentScrollY - previousScrollY;
  if (currentScrollY < 24) {
    topbar?.classList.remove("is-hidden");
    downDistance = 0;
    upDistance = 0;
  } else if (movement > 0) {
    downDistance += movement;
    upDistance = 0;
    if (downDistance >= 4 && currentScrollY > 40) topbar?.classList.add("is-hidden");
  } else if (movement < 0) {
    upDistance += Math.abs(movement);
    downDistance = 0;
    if (upDistance >= 1) topbar?.classList.remove("is-hidden");
  }
  previousScrollY = currentScrollY;
}, { passive: true });

const demoSequences = {
  install: [
    ["git clone https://github.com/yaso09/dontrea.git", "command-row", true],
    ["cd dontrea", "command-row", true],
    ["npm install", "command-row", true],
    ["npm link", "command-row", true],
    ["# Optional: enable WebAssembly compilation", "comment-row"],
    ["npm install -g @shopify/javy-cli", "command-row", true],
  ],
  single: [
    ["dontrea -i index.html -o dist/protected.html -p 8 --no-wasm", "command-row", true],
    ["Dontrea Anti-Piracy Protection Pipeline starting...", "info-row"],
    ["[+] Extracted inline JavaScript for protection...", "info-row"],
    ["[+] Obfuscating JavaScript payload...", "info-row"],
    ["[i] Using Safe-Fallback Mode: High-security JS obfuscation.", "info-row"],
    ["[+] Distributing payload into 8 hidden structural segments...", "info-row"],
    ["[+] Executing structural HTML compression and minification...", "info-row"],
    ["[✓] Dontrea pipeline successfully compiled. Output file: dist/protected.html", "ok-row"],
  ],
  config: [
    ["dontrea config add -i src/index.html -o dist/index.html --parts 8 --no-wasm", "command-row", true],
    ["[✓] Updated config in <project>/dontrea.json", "ok-row"],
    ["", "info-row"],
    ["dontrea build", "command-row", true],
    ["Building src/index.html...", "info-row"],
    ["[+] Extracted inline JavaScript for protection...", "info-row"],
    ["[+] Obfuscating JavaScript payload...", "info-row"],
    ["[i] Using Safe-Fallback Mode: High-security JS obfuscation.", "info-row"],
    ["[+] Distributing payload into 8 hidden structural segments...", "info-row"],
    ["[+] Executing structural HTML compression and minification...", "info-row"],
    ["[✓] Dontrea pipeline successfully compiled. Output file: dist/index.html", "ok-row"],
  ],
  obfuscation: [
    ["dontrea -i game.html -o protected_game.html -p 12 --control-flow-flattening true --control-flow-flattening-threshold 1.0 --dead-code-injection true --debug-protection true --debug-protection-interval 1000 --self-defending true --domain-lock example.com www.example.com", "command-row", true],
    ["[+] Domain lock activated for: example.com, www.example.com", "info-row"],
    ["[+] Obfuscating JavaScript payload...", "info-row"],
    ["[+] Distributing payload into 12 hidden structural segments...", "info-row"],
    ["[✓] Dontrea pipeline successfully compiled. Output file: protected_game.html", "ok-row"],
  ],
  runtime: [
    ["npm install -g @shopify/javy-cli", "command-row", true],
    ["dontrea -i src/app.html -o dist/app.html", "command-row", true],
    ["[+] Compiling JavaScript to WebAssembly via Javy (...)...", "info-row"],
    ["[✓] Javy WebAssembly compilation successful (... bytes).", "ok-row"],
    ["", "info-row"],
    ["dontrea -i src/game.html -o dist/game.html --no-wasm", "command-row", true],
    ["[i] Using Safe-Fallback Mode: High-security JS obfuscation.", "info-row"],
  ],
  output: [
    ["dontrea -i index.html -o dist/index.html -p 8 --dynamic", "command-row", true],
    ["[+] Distributing payload into 8 hidden structural segments...", "info-row"],
    ["[+] Executing structural HTML compression and minification...", "info-row"],
    ["[✓] Dontrea pipeline successfully compiled. Output file: dist/index.html", "ok-row"],
    ["", "info-row"],
    ["dontrea -i index.html --wasm-binary ./engine.wasm --parts 8", "command-row", true],
    ["[✓] Using pre-compiled WebAssembly binary (... bytes).", "ok-row"],
  ],
};

const demoPanels = [...document.querySelectorAll(".demo-step")];
const preparedDemos = demoPanels.map((panel) => {
  const terminalOutput = panel.querySelector(".terminal-output");
  const sequence = demoSequences[panel.dataset.demo] || [];
  if (!terminalOutput) return null;
  const lines = sequence.filter(([text]) => text.length > 0).map(([text, kind = "info-row", prompt = false]) => {
    const row = document.createElement("div");
    row.className = `terminal-row ${kind}`;
    row.hidden = true;
    if (prompt) {
      const prefix = document.createElement("span");
      prefix.className = "prompt";
      prefix.textContent = "$ ";
      row.appendChild(prefix);
    }
    const body = document.createElement("span");
    row.appendChild(body);
    terminalOutput.appendChild(row);
    return { row, body, characters: [...text] };
  });
  const totalCharacters = lines.reduce((total, line) => total + line.characters.length, 0);
  const scrollLength = Math.max(480, Math.min(980, totalCharacters * 1.2));
  panel.style.setProperty("--demo-scroll", `${scrollLength}px`);
  return { panel, terminalOutput, lines, totalCharacters };
}).filter(Boolean);

function renderDemoProgress() {
  for (const demo of preparedDemos) {
    const { panel, terminalOutput, lines, totalCharacters } = demo;
    const travel = Math.max(1, panel.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -panel.getBoundingClientRect().top / travel));
    let remainingCharacters = Math.floor(totalCharacters * progress);
    for (const line of lines) {
      const visibleCharacters = Math.min(line.characters.length, Math.max(0, remainingCharacters));
      line.row.hidden = visibleCharacters === 0;
      line.body.textContent = line.characters.slice(0, visibleCharacters).join("");
      remainingCharacters -= visibleCharacters;
    }
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
}

renderDemoProgress();
window.addEventListener("scroll", renderDemoProgress, { passive: true });
window.addEventListener("resize", renderDemoProgress, { passive: true });

if (demoPanels.length && "IntersectionObserver" in window) {
  const demoObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        demoPanels.forEach((panel) => panel.classList.toggle("is-active", panel === entry.target));
      }
    }
  }, { rootMargin: "-35% 0px -35% 0px", threshold: 0 });
  demoPanels.forEach((panel) => demoObserver.observe(panel));
} else {
  demoPanels[0]?.classList.add("is-active");
}

const matrixCanvas = document.querySelector(".matrix-bg");
const matrixContext = matrixCanvas?.getContext("2d");
if (matrixCanvas && matrixContext) {
  const glyphs = "01<>/{}[]=;:#@*+";
  const sourceLines = [
    "<!doctype html>",
    `<html lang="${document.documentElement.lang}">`,
    "  <head>",
    "    <meta charset=\"utf-8\">",
    "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "    <title>Dontrea · protected output</title>",
    "    <script type=\"module\">",
    "      const payload = await protect(document);",
    "      window.dontrea = Object.freeze(payload);",
    "    </script>",
    "  </head>",
    "  <body data-dontrea=\"ready\">",
    "    <main id=\"app\" class=\"protected\">",
    "      <script>initializeApplication();</script>",
    "    </main>",
    "  </body>",
    "</html>",
  ];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let displayLines = [];
  let matrixWidth = 0;
  let matrixHeight = 0;
  let frameId;
  let lastFrame = 0;
  const cycleStartedAt = performance.now();
  const heroSection = matrixCanvas.closest(".hero");
  let pointerX = -1;
  let pointerY = -1;

  const resizeMatrix = () => {
    const bounds = matrixCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    matrixWidth = bounds.width;
    matrixHeight = bounds.height;
    matrixCanvas.width = Math.round(matrixWidth * ratio);
    matrixCanvas.height = Math.round(matrixHeight * ratio);
    matrixContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const fontSize = matrixWidth < 650 ? 8 : 10;
    const charWidth = fontSize * 0.61;
    const columns = Math.ceil(matrixWidth / charWidth) + 1;
    const rows = Math.max(1, Math.floor((matrixHeight - 10) / 18));
    displayLines = Array.from({ length: rows }, (_, rowIndex) => {
      let line = "";
      let snippetIndex = rowIndex;
      while (line.length < columns) {
        line += `${sourceLines[snippetIndex % sourceLines.length]}   `;
        snippetIndex += 1;
      }
      return line.slice(0, columns);
    });
    matrixContext.font = `${fontSize}px 'DM Mono', monospace`;
    matrixContext.textAlign = "left";
    matrixContext.textBaseline = "top";
  };

  const drawMatrix = (now = 0) => {
    if (!reducedMotion && now - lastFrame < 32) {
      frameId = window.requestAnimationFrame(drawMatrix);
      return;
    }
    lastFrame = now;
    matrixContext.clearRect(0, 0, matrixWidth, matrixHeight);
    const encryptDuration = 2900;
    const encryptedPause = 400;
    const decryptDuration = 2900;
    const clearPause = 800;
    const cycleDuration = encryptDuration + encryptedPause + decryptDuration + clearPause;
    const cycleTime = reducedMotion ? 0 : (now - cycleStartedAt) % cycleDuration;
    const decryptStartsAt = encryptDuration + encryptedPause;
    const encrypting = cycleTime < encryptDuration;
    const encryptedHold = cycleTime >= encryptDuration && cycleTime < decryptStartsAt;
    const decrypting = cycleTime >= decryptStartsAt && cycleTime < decryptStartsAt + decryptDuration;
    const progress = cycleTime < encryptDuration
      ? cycleTime / encryptDuration
      : cycleTime < decryptStartsAt
        ? 1
        : decrypting
          ? (cycleTime - decryptStartsAt) / decryptDuration
          : 0;
    const sweep = progress * progress * (3 - 2 * progress);
    matrixContext.font = `${matrixWidth < 650 ? 8 : 10}px 'DM Mono', monospace`;
    matrixContext.textAlign = "left";
    matrixContext.textBaseline = "top";
    displayLines.forEach((line, lineIndex) => {
      const y = lineIndex * 18 + 8;
      for (let index = 0; index < line.length; index++) {
        const x = index * (matrixWidth < 650 ? 4.88 : 6.1);
        const horizontal = x / Math.max(1, matrixWidth);
        const wavePhase = sweep * Math.PI * 2;
        const waveEnvelope = Math.sin(Math.PI * sweep);
        const curve = (
          Math.sin(horizontal * Math.PI * 2.6 + wavePhase) * 24
          + Math.sin(horizontal * Math.PI * 5 - wavePhase * 1.3) * 8
        ) * waveEnvelope;
        const front = sweep * matrixHeight + curve;
        const distanceFromFront = y - front;
        let character = line[index];
        let color = "rgba(155, 190, 132, 0.3)";
        const hash = ((lineIndex + 1) * 73856093 ^ (index + 1) * 19349663) >>> 0;
        const atTransition = (encrypting || decrypting) && Math.abs(distanceFromFront) < 30;
        if (!reducedMotion && atTransition) {
          if (character !== " ") character = glyphs[hash % glyphs.length];
          color = "rgba(94, 111, 88, 0.28)";
        } else if (!reducedMotion && (encryptedHold || (encrypting && distanceFromFront < -22) || (decrypting && distanceFromFront > 22)) && character !== " ") {
          character = glyphs[hash % glyphs.length];
          color = "rgba(157, 194, 126, 0.36)";
        }
        const hoverDistance = Math.hypot(x + 3 - pointerX, y + 6 - pointerY);
        if (pointerX >= 0 && hoverDistance < 84) {
          const intensity = 1 - hoverDistance / 84;
          color = `rgba(210, 248, 151, ${0.3 + intensity * 0.62})`;
        }
        matrixContext.fillStyle = color;
        matrixContext.fillText(character, x, y);
      }
    });

    if (!reducedMotion) frameId = window.requestAnimationFrame(drawMatrix);
  };

  resizeMatrix();
  drawMatrix();
  window.addEventListener("resize", resizeMatrix, { passive: true });
  heroSection?.addEventListener("pointermove", (event) => {
    const bounds = matrixCanvas.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
  }, { passive: true });
  heroSection?.addEventListener("pointerleave", () => {
    pointerX = -1;
    pointerY = -1;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.cancelAnimationFrame(frameId);
    else if (!reducedMotion) frameId = window.requestAnimationFrame(drawMatrix);
  });
}
