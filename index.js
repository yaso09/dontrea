#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { program } = require('commander');
const cheerio = require('cheerio');
const chalk = require('chalk');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('html-minifier-terser');

// ─── Javy CLI Detection ───
let javyAvailable = false;
let javyVersion = '';

function checkJavy() {
    try {
        const out = execSync('javy --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        javyAvailable = true;
        javyVersion = out;
        return true;
    } catch {
        javyAvailable = false;
        return false;
    }
}

// ─── Browser Hardware / Media API Detection ───
// Headless WebAssembly environments (like QuickJS inside Javy) cannot directly drive
// audio output devices (Web Audio API / AudioContext) or GPU render pipelines (Canvas 2D / WebGL)
// without native host execution.
const BROWSER_ONLY_APIS = [
    { pattern: /\b(AudioContext|webkitAudioContext)\b/, name: 'Web Audio API (AudioContext)', reason: 'Headless Wasm cannot emulate audio hardware' },
    { pattern: /\bgetContext\s*\(\s*['"](2d|webgl|webgl2)['"]\s*\)/, name: 'Canvas 2D / WebGL Context', reason: 'Headless Wasm cannot emulate hardware GPU rendering' },
    { pattern: /\b(WebGLRenderingContext|WebGL2RenderingContext)\b/, name: 'WebGL Context', reason: 'Headless Wasm cannot interface with WebGL GPU context' },
];

function analyzeCodeForBrowserSpecificAPIs(code) {
    const issues = [];
    for (const { pattern, name, reason } of BROWSER_ONLY_APIS) {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({ name, reason, count: matches.length });
        }
    }
    return issues;
}

// ─── Javy Transparent Browser Bridge Prelude ───
// Inlined into the JavaScript code before compiling to Javy WebAssembly.
// Provides transparent DOM, window, console, and web API bridging from inside QuickJS Wasm.
const JAVY_BROWSER_BRIDGE = `
(function(global) {
    if (typeof Javy === 'undefined' || !Javy.IO) return;
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    function __rpc(cmd) {
        try {
            const payload = JSON.stringify(cmd);
            const msg = '__DONTREA_RPC__' + payload + '\\n';
            Javy.IO.writeSync(1, encoder.encode(msg));
            const buf = new Uint8Array(65536);
            const n = Javy.IO.readSync(0, buf);
            const resStr = decoder.decode(buf.subarray(0, n));
            const res = JSON.parse(resStr);
            if (res.error) {
                console.warn('[Dontrea Bridge] Host call notice:', res.error);
                return undefined;
            }
            return res.result;
        } catch(e) {
            return undefined;
        }
    }
    
    function hostEval(code) {
        return __rpc({ type: 'eval', code });
    }
    
    global.__hostEval = hostEval;
    global.__hostRpc = __rpc;
    
    function makeBridgeFunction(targetExpr) {
        return function(...args) {
            const serializedArgs = args.map(a => {
                try { return JSON.stringify(a); } catch { return 'undefined'; }
            }).join(',');
            if (new.target) {
                return hostEval('new (' + targetExpr + ')(' + serializedArgs + ')');
            } else {
                return hostEval('(' + targetExpr + ')(' + serializedArgs + ')');
            }
        };
    }
    
    // Transparent DOM Bridge
    if (typeof global.document === 'undefined') {
        global.document = new Proxy({}, {
            get(target, prop) {
                if (prop === 'getElementById') {
                    return function(id) {
                        return new Proxy({ id }, {
                            get(elTarget, elProp) {
                                if (elProp === 'style') {
                                    return new Proxy({}, {
                                        set(sTarget, sProp, sVal) {
                                            hostEval('document.getElementById(' + JSON.stringify(id) + ').style[' + JSON.stringify(sProp) + '] = ' + JSON.stringify(sVal));
                                            return true;
                                        },
                                        get(sTarget, sProp) {
                                            return hostEval('document.getElementById(' + JSON.stringify(id) + ').style[' + JSON.stringify(sProp) + ']');
                                        }
                                    });
                                }
                                if (elProp === 'setAttribute') {
                                    return function(attr, val) {
                                        return hostEval('document.getElementById(' + JSON.stringify(id) + ').setAttribute(' + JSON.stringify(attr) + ', ' + JSON.stringify(val) + ')');
                                    };
                                }
                                if (elProp === 'getAttribute') {
                                    return function(attr) {
                                        return hostEval('document.getElementById(' + JSON.stringify(id) + ').getAttribute(' + JSON.stringify(attr) + ')');
                                    };
                                }
                                if (elProp === 'addEventListener') {
                                    return function(evt, handler) {
                                        hostEval('document.getElementById(' + JSON.stringify(id) + ').addEventListener(' + JSON.stringify(evt) + ', ' + (typeof handler === 'function' ? handler.toString() : 'function(){}') + ')');
                                    };
                                }
                                return hostEval('document.getElementById(' + JSON.stringify(id) + ')[' + JSON.stringify(elProp) + ']');
                            },
                            set(elTarget, elProp, val) {
                                hostEval('document.getElementById(' + JSON.stringify(id) + ')[' + JSON.stringify(elProp) + '] = ' + JSON.stringify(val));
                                return true;
                            }
                        });
                    };
                }
                if (prop === 'querySelector') {
                    return function(sel) {
                        return new Proxy({ sel }, {
                            get(elTarget, elProp) {
                                if (elProp === 'style') {
                                    return new Proxy({}, {
                                        set(sTarget, sProp, sVal) {
                                            hostEval('document.querySelector(' + JSON.stringify(sel) + ').style[' + JSON.stringify(sProp) + '] = ' + JSON.stringify(sVal));
                                            return true;
                                        },
                                        get(sTarget, sProp) {
                                            return hostEval('document.querySelector(' + JSON.stringify(sel) + ').style[' + JSON.stringify(sProp) + ']');
                                        }
                                    });
                                }
                                return hostEval('document.querySelector(' + JSON.stringify(sel) + ')[' + JSON.stringify(elProp) + ']');
                            },
                            set(elTarget, elProp, val) {
                                hostEval('document.querySelector(' + JSON.stringify(sel) + ')[' + JSON.stringify(elProp) + '] = ' + JSON.stringify(val));
                                return true;
                            }
                        });
                    };
                }
                if (prop === 'createElement') {
                    return function(tag) {
                        return hostEval('document.createElement(' + JSON.stringify(tag) + ')');
                    };
                }
                if (prop === 'body') {
                    return new Proxy({}, {
                        get(t, p) { return hostEval('document.body[' + JSON.stringify(p) + ']'); },
                        set(t, p, v) { hostEval('document.body[' + JSON.stringify(p) + '] = ' + JSON.stringify(v)); return true; }
                    });
                }
                if (prop === 'title') {
                    return hostEval('document.title');
                }
                return makeBridgeFunction('document[' + JSON.stringify(prop) + ']');
            },
            set(target, prop, val) {
                hostEval('document[' + JSON.stringify(prop) + '] = ' + JSON.stringify(val));
                return true;
            }
        });
    }
    
    // Transparent Window Bridge
    if (typeof global.window === 'undefined') {
        global.window = new Proxy(global, {
            get(target, prop) {
                if (prop in target) return target[prop];
                if (prop === 'alert') return (msg) => hostEval('alert(' + JSON.stringify(msg) + ')');
                if (prop === 'confirm') return (msg) => hostEval('confirm(' + JSON.stringify(msg) + ')');
                if (prop === 'prompt') return (msg, def) => hostEval('prompt(' + JSON.stringify(msg) + ', ' + JSON.stringify(def) + ')');
                if (prop === 'location') {
                    return new Proxy({}, {
                        get(lTarget, lProp) { return hostEval('location[' + JSON.stringify(lProp) + ']'); },
                        set(lTarget, lProp, val) { hostEval('location[' + JSON.stringify(lProp) + '] = ' + JSON.stringify(val)); return true; }
                    });
                }
                if (prop === 'localStorage') {
                    return {
                        getItem: (k) => hostEval('localStorage.getItem(' + JSON.stringify(k) + ')'),
                        setItem: (k, v) => hostEval('localStorage.setItem(' + JSON.stringify(k) + ', ' + JSON.stringify(v) + ')'),
                        removeItem: (k) => hostEval('localStorage.removeItem(' + JSON.stringify(k) + ')'),
                        clear: () => hostEval('localStorage.clear()'),
                    };
                }
                if (prop === 'sessionStorage') {
                    return {
                        getItem: (k) => hostEval('sessionStorage.getItem(' + JSON.stringify(k) + ')'),
                        setItem: (k, v) => hostEval('sessionStorage.setItem(' + JSON.stringify(k) + ', ' + JSON.stringify(v) + ')'),
                        removeItem: (k) => hostEval('sessionStorage.removeItem(' + JSON.stringify(k) + ')'),
                        clear: () => hostEval('sessionStorage.clear()'),
                    };
                }
                // Handle both normal function calls and constructor calls with new
                return makeBridgeFunction('window[' + JSON.stringify(prop) + ']');
            },
            set(target, prop, val) {
                target[prop] = val;
                hostEval('window[' + JSON.stringify(prop) + '] = ' + JSON.stringify(val));
                return true;
            }
        });
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

// ─── Bootstrap Loader Generation (Javy WASI + Fallback) ───
function generateWasmBootstrapInline(hiddenSelectors, isWasm) {
    return `
        (function() {
            window.addEventListener('DOMContentLoaded', async () => {
                try {
                    const map = ${JSON.stringify(hiddenSelectors)};
                    let payload = "";
                    for (let i = 0; i < map.length; i++) {
                        const el = document.getElementById(map[i].id);
                        if (el) payload += el.getAttribute(map[i].attr);
                    }
                    
                    const isWasmEngine = ${isWasm};
                    if (isWasmEngine) {
                        const binary = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
                        
                        let memory;
                        let hostResBuffer = new Uint8Array(0);
                        const textDecoder = new TextDecoder('utf-8');
                        const textEncoder = new TextEncoder();
                        
                        // WASI snapshot preview 1 implementation for Javy QuickJS
                        const wasi = {
                            fd_write: (fd, iovs, iovs_len, nwritten) => {
                                const view = new DataView(memory.buffer);
                                let written = 0;
                                let str = '';
                                for (let i = 0; i < iovs_len; i++) {
                                    const ptr = view.getUint32(iovs + i * 8, true);
                                    const len = view.getUint32(iovs + i * 8 + 4, true);
                                    const bytes = new Uint8Array(memory.buffer, ptr, len);
                                    str += textDecoder.decode(bytes);
                                    written += len;
                                }
                                view.setUint32(nwritten, written, true);
                                
                                // Intercept RPC calls
                                if (str.startsWith('__DONTREA_RPC__')) {
                                    const payload = str.substring('__DONTREA_RPC__'.length).trim();
                                    let result = null, error = null;
                                    try {
                                        const cmd = JSON.parse(payload);
                                        if (cmd.type === 'eval') {
                                            const raw = (0, eval)(cmd.code);
                                            if (raw === undefined) {
                                                result = null;
                                            } else if (typeof raw === 'object' && raw !== null) {
                                                try {
                                                    JSON.stringify(raw);
                                                    result = raw;
                                                } catch {
                                                    result = {};
                                                }
                                            } else {
                                                result = raw;
                                            }
                                        }
                                    } catch (e) {
                                        error = e.message;
                                    }
                                    let resStr;
                                    try {
                                        resStr = JSON.stringify({ result, error });
                                    } catch {
                                        resStr = JSON.stringify({ result: null, error: String(error) });
                                    }
                                    hostResBuffer = textEncoder.encode(resStr);
                                } else {
                                    if (fd === 2) {
                                        console.error(str);
                                    } else {
                                        console.log(str);
                                    }
                                }
                                return 0;
                            },
                            fd_read: (fd, iovs, iovs_len, nread) => {
                                const view = new DataView(memory.buffer);
                                let readTotal = 0;
                                for (let i = 0; i < iovs_len; i++) {
                                    const ptr = view.getUint32(iovs + i * 8, true);
                                    const len = view.getUint32(iovs + i * 8 + 4, true);
                                    const toRead = Math.min(len, hostResBuffer.length);
                                    if (toRead > 0) {
                                        new Uint8Array(memory.buffer, ptr, toRead).set(hostResBuffer.subarray(0, toRead));
                                        hostResBuffer = hostResBuffer.subarray(toRead);
                                        readTotal += toRead;
                                    }
                                }
                                view.setUint32(nread, readTotal, true);
                                return 0;
                            },
                            clock_time_get: (id, precision, time_out) => {
                                const now = BigInt(Math.floor(performance.now() * 1000000));
                                new DataView(memory.buffer).setBigUint64(time_out, now, true);
                                return 0;
                            },
                            environ_get: () => 0,
                            environ_sizes_get: (count_out, buf_size_out) => {
                                new DataView(memory.buffer).setUint32(count_out, 0, true);
                                new DataView(memory.buffer).setUint32(buf_size_out, 0, true);
                                return 0;
                            },
                            fd_close: () => 0,
                            fd_fdstat_get: () => 0,
                            fd_seek: () => 0,
                            proc_exit: (code) => {}
                        };
                        
                        const module = await WebAssembly.compile(binary);
                        const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi });
                        memory = instance.exports.memory;
                        window.__DONTREA_WASM_INSTANCE__ = instance;
                        
                        if (instance.exports._start) {
                            instance.exports._start();
                        } else if (instance.exports.__main_void) {
                            instance.exports.__main_void();
                        }
                    } else {
                        // Safe-Fallback Mode: Decode obfuscated JS payload and evaluate
                        const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
                        const decodedJs = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                        (0, eval)(decodedJs);
                    }
                } catch(err) {
                    console.error('Dontrea bootstrap error:', err);
                }
            });
        })();
    `;
}

// ─── CLI Configuration ───
program
    .name('dontrea')
    .description('Dontrea: Denuvo-style advanced HTML/JS protection pipeline with Javy JS-to-Wasm compilation')
    .version('1.0.0');

program
    .requiredOption('-i, --input <path>', 'Input HTML file path')
    .option('-o, --output <path>', 'Output protected HTML file path', 'protected.html')
    .option('-p, --parts <number>', 'Number of chunks to split the code into', '5')
    .option('--control-flow-flattening <boolean>', 'Enable control flow flattening', 'false')
    .option('--control-flow-flattening-threshold <number>', 'Control flow threshold', '0.75')
    .option('--dead-code-injection <boolean>', 'Enable dead code injection', 'false')
    .option('--debug-protection <boolean>', 'Enable Anti-DevTools loop', 'false')
    .option('--debug-protection-interval <number>', 'Interval for debug protection loop in ms', '2000')
    .option('--self-defending <boolean>', 'Enable Self-Defending structure', 'false')
    .option('--domain-lock <domains...>', 'Lock execution to specific domains')
    .option('--force-wasm <boolean>', 'Force Wasm compilation even if browser-only media/canvas APIs are detected', 'false')
    .option('--no-wasm', 'Disable WebAssembly compilation and use Safe-Fallback JS obfuscation')
    .option('--dynamic', 'Compile with Javy dynamic QuickJS provider flag (-d)', false)
    .option('--wasm-binary <path>', 'Path to pre-compiled Wasm binary (base64 or .wasm file)');

program.parse(process.argv);
const rawOptions = program.opts();

const options = {
    input: rawOptions.input,
    output: rawOptions.output,
    parts: rawOptions.parts,
    controlFlowFlattening: rawOptions.controlFlowFlattening === 'true',
    controlFlowFlatteningThreshold: rawOptions.controlFlowFlatteningThreshold,
    deadCodeInjection: rawOptions.deadCodeInjection === 'true',
    debugProtection: rawOptions.debugProtection === 'true',
    debugProtectionInterval: rawOptions.debugProtectionInterval,
    selfDefending: rawOptions.selfDefending === 'true',
    domainLock: rawOptions.domainLock,
    forceWasm: rawOptions.forceWasm === 'true',
    noWasm: rawOptions.wasm === false,
    dynamic: rawOptions.dynamic === true,
    wasmBinary: rawOptions.wasmBinary,
};

async function runPipeline() {
    console.log(chalk.cyan.bold('\n🛡️  Dontrea Anti-Piracy Protection Pipeline starting...'));
    
    // Check Javy compiler availability
    const hasJavy = checkJavy();
    if (hasJavy) {
        console.log(chalk.green(`[+] Javy JS-to-Wasm compiler detected (${javyVersion})`));
    } else {
        console.log(chalk.yellow(`[!] Javy CLI not detected in system PATH.`));
        console.log(chalk.blue(`[i] Install via: npm install -g @shopify/javy-cli or download from github.com/Shopify/javy/releases`));
        console.log(chalk.blue(`[i] Safe-Fallback (obfuscated JavaScript) will be used if no Wasm binary is provided.`));
    }
    
    if (!fs.existsSync(options.input)) {
        console.error(chalk.red(`[-] Error: Input file not found at ${options.input}`));
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(options.input, 'utf8');
    const $ = cheerio.load(htmlContent);

    // Ensure UTF-8 meta tag
    if (!$('head').length) $('html').prepend('<head></head>');
    const existingCharset = $('meta[charset]').first();
    if (existingCharset.length) existingCharset.remove();
    $('head').prepend('<meta charset="utf-8">');

    let combinedJsCode = "";
    let finalPayloadBase64 = "";
    let isWasm = false;
    let chunks = [];
    const partCount = parseInt(options.parts) || 5;
    
    // 1. Script Extraction
    $('script').each((index, element) => {
        const el = $(element);
        if (!el.attr('src') && el.html() && el.html().trim().length > 0) {
            combinedJsCode += el.html() + "\n";
            el.remove(); 
        }
    });

    if (!combinedJsCode.trim()) {
        console.log(chalk.yellow('[!] No inline JavaScript blocks found to protect. Splicing HTML directly.'));
    } else {
        console.log(chalk.green(`[+] Extracted inline JavaScript for protection...`));

        // 2. Static Analysis: Detect browser hardware/media APIs
        const browserApiIssues = analyzeCodeForBrowserSpecificAPIs(combinedJsCode);
        const hasHardwareMediaAPIs = browserApiIssues.length > 0;
        
        if (hasHardwareMediaAPIs) {
            console.log(chalk.yellow(`[!] Browser hardware/media APIs detected in script:`));
            for (const issue of browserApiIssues) {
                console.log(chalk.yellow(`    - ${issue.name} (${issue.count}x): ${issue.reason}`));
            }
            if (!options.forceWasm && !options.wasmBinary) {
                console.log(chalk.blue(`[i] Automatically switching to Safe-Fallback Mode (high-security JS obfuscation).`));
                console.log(chalk.blue(`[i] (Use --force-wasm true to override and compile to Wasm anyway).`));
            }
        }

        // 3. JavaScript Obfuscation
        const obfuscatorConfig = {
            compact: true,
            numbersToExpressions: true,
            stringArray: true,
            stringArrayThreshold: 0.8,
            controlFlowFlattening: options.controlFlowFlattening,
            controlFlowFlatteningThreshold: parseFloat(options.controlFlowFlatteningThreshold),
            deadCodeInjection: options.deadCodeInjection,
            debugProtection: options.debugProtection,
            debugProtectionInterval: parseInt(options.debugProtectionInterval),
            selfDefending: options.selfDefending
        };

        if (options.domainLock && options.domainLock.length > 0) {
            obfuscatorConfig.domainLock = options.domainLock;
            console.log(chalk.blue(`[+] Domain lock activated for: ${options.domainLock.join(', ')}`));
        }

        console.log(chalk.green(`[+] Obfuscating JavaScript payload...`));
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(combinedJsCode, obfuscatorConfig);
        const targetJsPayload = obfuscatedResult.getObfuscatedCode();

        // 4. Wasm Compilation / Payload Preparation
        let wasmBytes = null;

        // Option A: Use pre-compiled Wasm binary
        if (options.wasmBinary) {
            try {
                let wasmData;
                if (options.wasmBinary.endsWith('.wasm') || options.wasmBinary.endsWith('.wat')) {
                    wasmData = fs.readFileSync(options.wasmBinary);
                } else {
                    wasmData = Buffer.from(options.wasmBinary, 'base64');
                }
                wasmBytes = new Uint8Array(wasmData);
                finalPayloadBase64 = Buffer.from(wasmBytes).toString('base64');
                isWasm = true;
                console.log(chalk.green(`[✓] Using pre-compiled WebAssembly binary (${wasmBytes.length} bytes).`));
            } catch (e) {
                console.error(chalk.red(`[-] Failed to load Wasm binary: ${e.message}`));
                process.exit(1);
            }
        }
        // Option B: Compile via Javy (when Javy is available and either no hardware APIs or forced)
        else if (hasJavy && !options.noWasm && (!hasHardwareMediaAPIs || options.forceWasm)) {
            try {
                console.log(chalk.green(`[+] Compiling JavaScript to WebAssembly via Javy (${javyVersion})...`));
                
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dontrea-javy-'));
                const inputFile = path.join(tmpDir, 'input.js');
                const outputFile = path.join(tmpDir, 'output.wasm');
                
                // Combine Javy transparent browser bridge with obfuscated JS wrapped in an IIFE
                // Wrapping in an IIFE avoids ES Module duplicate lexical declaration errors
                const sourceForWasm = `${JAVY_BROWSER_BRIDGE}\n(function() {\n${targetJsPayload}\n}).call(typeof globalThis !== 'undefined' ? globalThis : this);\n`;
                fs.writeFileSync(inputFile, sourceForWasm, 'utf8');
                
                const dynamicFlag = options.dynamic ? '-d' : '';
                const cmd = `javy compile ${dynamicFlag} "${inputFile}" -o "${outputFile}"`;
                
                execSync(cmd, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    timeout: 180000,
                });
                
                if (fs.existsSync(outputFile)) {
                    wasmBytes = new Uint8Array(fs.readFileSync(outputFile));
                    finalPayloadBase64 = Buffer.from(wasmBytes).toString('base64');
                    isWasm = true;
                    console.log(chalk.green(`[✓] Javy WebAssembly compilation successful (${wasmBytes.length} bytes).`));
                } else {
                    throw new Error('Javy did not produce output.wasm');
                }
                
                fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch (wasmError) {
                console.log(chalk.yellow(`[!] Javy compilation failed: ${wasmError.message}`));
                console.log(chalk.yellow('[!] Activating Safe-Fallback Mode (JS obfuscation only).'));
                finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
                isWasm = false;
            }
        }
        // Option C: Safe-Fallback Mode (no Wasm or browser-only APIs present)
        else {
            finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
            isWasm = false;
            console.log(chalk.blue('[i] Using Safe-Fallback Mode: High-security JS obfuscation.'));
        }

        // 5. Distribution Architecture (Denuvo-style chunking)
        const chunkSize = Math.ceil(finalPayloadBase64.length / partCount);
        chunks = [];

        for (let i = 0; i < finalPayloadBase64.length; i += chunkSize) {
            chunks.push(finalPayloadBase64.substring(i, i + chunkSize));
        }

        console.log(chalk.green(`[+] Distributing payload into ${chunks.length} hidden structural segments...`));

        const hiddenSelectors = [];
        const HTML_TAGS = ['div', 'span', 'p', 'section', 'article', 'aside', 'nav', 'header', 'footer'];

        chunks.forEach((chunk, index) => {
            const randomTag = HTML_TAGS[Math.floor(Math.random() * HTML_TAGS.length)];
            const elementId = `dontrea-_0x${Math.random().toString(16).substring(2, 8)}`;
            const attrName = `data-node-_0x${Math.random().toString(16).substring(2, 8)}`;
            
            $('body').append(`<${randomTag} id="${elementId}" ${attrName}="${chunk}" class="dontrea-hidden" aria-hidden="true" tabindex="-1"></${randomTag}>`);
            hiddenSelectors.push({ id: elementId, attr: attrName });
        });

        // Add stealth CSS for hidden elements
        const stealthCSS = `
            .dontrea-hidden {
                display: none !important;
                visibility: hidden !important;
                position: absolute !important;
                z-index: -9999 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
        `;
        $('head').append(`<style>${stealthCSS}</style>`);

        // 6. Bootstrap Loader Generation
        const bootstrapLoader = generateWasmBootstrapInline(hiddenSelectors, isWasm);

        // Obfuscate the bootstrap loader for maximum resistance
        const secureLoader = JavaScriptObfuscator.obfuscate(bootstrapLoader, {
            compact: true,
            selfDefending: true,
            debugProtection: options.debugProtection,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1.0,
            deadCodeInjection: true,
            stringArray: true,
            stringArrayThreshold: 1.0,
        }).getObfuscatedCode();

        $('body').append(`<script>${secureLoader}</script>`);
    }

    // 7. HTML Minification
    console.log(chalk.green(`[+] Executing structural HTML compression and minification...`));
    const processedHtml = $.html();
    
    try {
        const minifiedHtml = await minify(processedHtml, {
            removeAttributeQuotes: false,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: false, // Don't re-minify already obfuscated JS
            removeComments: true,
            keepClosingSlash: true,
        });

        const outputDir = path.dirname(options.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(options.output, minifiedHtml, 'utf8');
        console.log(chalk.green.bold(`[✓] Dontrea pipeline successfully compiled. Output file: ${options.output}\n`));
        
        // Summary Banner
        const modeStr = isWasm 
            ? `WebAssembly (Javy ${javyVersion || 'Engine'})` 
            : 'JS Obfuscation (Safe-Fallback)';
        console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│                 DONTREA PROTECTION SUMMARY                  │'));
        console.log(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));
        console.log(chalk.cyan(`│ Mode:     ${modeStr.padEnd(49)} │`));
        console.log(chalk.cyan(`│ Chunks:   ${String(partCount).padStart(2)} │ Parts: ${String(chunks.length).padStart(2)} │ Payload: ${String(finalPayloadBase64.length).padStart(7)} chars │`));
        console.log(chalk.cyan('└─────────────────────────────────────────────────────────────┘\n'));
        
    } catch (minifyError) {
        console.error(chalk.red(`[-] Minification failed: ${minifyError.message}`));
        fs.writeFileSync(options.output, processedHtml, 'utf8');
    }
}

runPipeline();