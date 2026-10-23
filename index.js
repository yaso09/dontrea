#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const cheerio = require('cheerio');
const chalk = require('chalk');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('html-minifier-terser');

// ─── Porffor Submodule Loader ───
const PORFFOR_SUBMODULE_PATH = path.join(__dirname, 'porffor');

let porfforCompiler = null;
let porfforCompile = null;
let porfforSource = 'none';

async function loadPorffor() {
    // Try system-installed Porffor (npm package) first - has native binary
    try {
        const porfforPkg = require('porffor');
        porfforCompile = porfforPkg;
        try {
            const compilerPkg = require('porffor/compiler/index.js');
            porfforCompiler = compilerPkg;
        } catch {}
        porfforSource = 'system';
        console.log(chalk.green(`[+] Porffor loaded from system package`));
        return true;
    } catch (e) {
        // System package not available
    }
    
    // Try submodule as reference (for development)
    if (fs.existsSync(PORFFOR_SUBMODULE_PATH)) {
        porfforSource = 'submodule (reference only)';
        console.log(chalk.blue(`[i] Porffor submodule found at: ${PORFFOR_SUBMODULE_PATH}`));
        console.log(chalk.blue(`[i] For Wasm compilation, use: git submodule update --init && cd porffor && npm install`));
        console.log(chalk.blue(`[i] Then compile on Linux/macOS/WSL: node runtime/index.js wasm input.js output.wasm`));
        return false; // Don't claim Wasm capability
    }
    
    porfforSource = 'none';
    console.log(chalk.yellow(`[!] Porffor not found. Wasm compilation unavailable.`));
    console.log(chalk.blue(`[i] Install: npm install porffor`));
    console.log(chalk.blue(`[i] Or initialize submodule: git submodule update --init --recursive`));
    return false;
}

// ─── Static Analysis: Detect unsupported browser APIs ───
const UNSUPPORTED_PATTERNS = [
    { pattern: /\bProxy\b/, name: 'Proxy', reason: 'Porffor only has stub implementation (traps never run)' },
    { pattern: /\bwith\s*\(/, name: 'with statement', reason: 'Unsafe - compiles without correct scope semantics' },
    { pattern: /\beval\s*\(/, name: 'eval()', reason: 'Build-time only, runtime-generated code not supported' },
    { pattern: /\bnew\s+Function\s*\(/, name: 'new Function()', reason: 'Build-time only, runtime-generated code not supported' },
    { pattern: /\bBigInt\b/, name: 'BigInt', reason: 'Partial support - edge cases remain' },
    { pattern: /\bAtomics\b/, name: 'Atomics', reason: 'Mostly stubbed - only isLockFree is useful' },
    { pattern: /\bWebAssembly\b/, name: 'WebAssembly', reason: 'Absent in Porffor runtime' },
    { pattern: /\bfetch\s*\(/, name: 'fetch()', reason: 'Not in client builds - requires server build with event-loop' },
    { pattern: /\bcrypto\b/, name: 'crypto', reason: 'Not available in Porffor runtime' },
    { pattern: /\bURLSearchParams\b/, name: 'URLSearchParams', reason: 'Not available in Porffor runtime' },
    { pattern: /\bstructuredClone\b/, name: 'structuredClone', reason: 'Not available in Porffor runtime' },
    { pattern: /\bAbortController\b/, name: 'AbortController', reason: 'Not available in Porffor runtime' },
    { pattern: /\bEventTarget\b/, name: 'EventTarget', reason: 'Not available in Porffor runtime' },
    { pattern: /\bWorker\b/, name: 'Worker', reason: 'Not available in Porffor runtime' },
    { pattern: /\bprocess\b/, name: 'process', reason: 'No Node.js host - no process object' },
    { pattern: /\brequire\s*\(/, name: 'require()', reason: 'No Node.js modules - file imports must be bundled first' },
    { pattern: /\bimport\s+.*from\s+['"](?!\.)/, name: 'bare imports', reason: 'File and package imports require bundling first' },
];

function analyzeCodeForPorfforCompatibility(code) {
    const issues = [];
    for (const { pattern, name, reason } of UNSUPPORTED_PATTERNS) {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({ name, reason, count: matches.length });
        }
    }
    return issues;
}

// ─── Bootstrap Loader Generation (Wasm with browser imports) ───
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
                        
                        // ─── Inlined Browser API Imports for Porffor Wasm ───
                        const textEncoder = new TextEncoder();
                        const textDecoder = new TextDecoder('utf-8', { fatal: true });
                        const stringHeap = new Map();
                        let nextStringId = 1;
                        
                        function $allocStr(s) {
                            const bytes = textEncoder.encode(s);
                            const id = nextStringId++;
                            stringHeap.set(id, { bytes, len: bytes.length });
                            return id;
                        }
                        function $getStr(id) {
                            const e = stringHeap.get(id);
                            return e ? textDecoder.decode(e.bytes) : '';
                        }
                        function $freeStr(id) { stringHeap.delete(id); }
                        
                        // DOM API
                        const dom = {
                            getElementById: (id) => {
                                const el = document.getElementById($getStr(id));
                                return el ? $allocStr('__DOM__:' + el.id) : 0;
                            },
                            createElement: (tag) => {
                                const el = document.createElement($getStr(tag));
                                return $allocStr('__DOM__:' + el.tagName + ':' + Date.now());
                            },
                            setAttribute: (el, name, value) => {
                                // Simplified - real impl needs element registry
                            },
                            querySelector: (sel) => {
                                const el = document.querySelector($getStr(sel));
                                return el ? $allocStr('__DOM__:' + $getStr(sel)) : 0;
                            },
                            getAttribute: (el, name) => $allocStr(''),
                            setInnerHTML: (el, html) => {},
                            addEventListener: (el, type, listener) => {},
                        };
                        
                        // Fetch API
                        const fetchApi = {
                            fetch: async (url, options) => {
                                try {
                                    const res = await fetch($getStr(url), options ? JSON.parse($getStr(options)) : {});
                                    return $allocStr(JSON.stringify({
                                        ok: res.ok, status: res.status, statusText: res.statusText,
                                        headers: Object.fromEntries(res.headers.entries())
                                    }));
                                } catch(e) { return $allocStr(JSON.stringify({ error: e.message })); }
                            }
                        };
                        
                        // localStorage
                        const storage = {
                            getItem: (key) => { const v = localStorage.getItem($getStr(key)); return v ? $allocStr(v) : 0; },
                            setItem: (key, value) => { localStorage.setItem($getStr(key), $getStr(value)); },
                            removeItem: (key) => { localStorage.removeItem($getStr(key)); },
                            clear: () => { localStorage.clear(); },
                            key: (i) => { const k = localStorage.key(i); return k ? $allocStr(k) : 0; },
                            getLength: () => localStorage.length,
                        };
                        
                        // AudioContext
                        const audio = {
                            createContext: (opts) => {
                                const AC = window.AudioContext || window.webkitAudioContext;
                                const ctx = new AC(opts ? JSON.parse($getStr(opts)) : {});
                                return $allocStr('__AUDIO_CTX__:' + Date.now());
                            }
                        };
                        
                        // Console
                        const consoleApi = {
                            log: (...a) => console.log(...a.map($getStr)),
                            error: (...a) => console.error(...a.map($getStr)),
                            warn: (...a) => console.warn(...a.map($getStr)),
                        };
                        
                        // Canvas/WebGL stubs
                        const canvas = {
                            getContext: (c, t) => $allocStr('__WEBGL__:' + $getStr(t)),
                        };
                        
                        // Create memory for Wasm module
                        const memory = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
                        
                        const imports = {
                            env: { 
                                memory, 
                                abort: (m,f,l,c) => console.error('Wasm abort:', $getStr(m), f, l, c) 
                            },
                            console: consoleApi,
                            dom,
                            fetch: fetchApi,
                            localStorage: storage,
                            audio,
                            canvas,
                        };
                        
                        const module = await WebAssembly.compile(binary);
                        const instance = await WebAssembly.instantiate(module, imports);
                        if (instance.exports.main) instance.exports.main();
                        window.__DONTREA_WASM_INSTANCE__ = instance;
                    } else {
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

// ─── CLI Config ───
program
    .name('dontrea')
    .description('Dontrea: Denuvo-style advanced HTML/JS protection pipeline with Porffor Wasm compilation')
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
    .option('--force-wasm <boolean>', 'Force Wasm compilation even with compatibility issues', 'false')
    .option('--analyze-only <boolean>', 'Only analyze compatibility, do not compile', 'false')
    .option('--wasm-binary <path>', 'Path to pre-compiled Wasm binary (base64 or .wasm file)');

program.parse(process.argv);
const rawOptions = program.opts();

// Parse boolean options correctly (commander returns strings for <boolean> type)
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
    analyzeOnly: rawOptions.analyzeOnly === 'true',
    wasmBinary: rawOptions.wasmBinary,
};

async function runPipeline() {
    console.log(chalk.cyan.bold('\n🛡️  Dontrea Anti-Piracy Protection Pipeline starting...'));
    
    // Load Porffor (submodule preferred, system package as fallback)
    await loadPorffor();
    
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

        // 2. Static Analysis for Porffor Compatibility
        const compatIssues = analyzeCodeForPorfforCompatibility(combinedJsCode);
        if (compatIssues.length > 0) {
            console.log(chalk.yellow(`[!] Porffor compatibility issues detected:`));
            for (const issue of compatIssues) {
                console.log(chalk.yellow(`    - ${issue.name} (${issue.count}x): ${issue.reason}`));
            }
            if (!options.forceWasm && !options.wasmBinary) {
                console.log(chalk.yellow('[!] Falling back to JS obfuscation mode. Use --force-wasm to attempt Wasm anyway, or --wasm-binary to provide pre-compiled Wasm.'));
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
        let finalPayloadBase64 = "";
        let isWasm = false;
        let wasmBytes = null;

        // Option A: Use pre-compiled Wasm binary
        if (options.wasmBinary) {
            try {
                let wasmData;
                if (options.wasmBinary.endsWith('.wasm') || options.wasmBinary.endsWith('.wat')) {
                    wasmData = fs.readFileSync(options.wasmBinary);
                } else {
                    // Assume base64
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
        // Option B: Attempt Porffor compilation using system package (has native binary)
        else if ((options.forceWasm || (compatIssues.length === 0 && !options.analyzeOnly)) && porfforCompiler && porfforSource === 'system') {
            try {
                console.log(chalk.green(`[+] Compiling obfuscated JavaScript to WebAssembly via Porffor AOT (system)...`));
                
                // Use lower-level compiler API for raw Wasm bytes
                const compileResult = porfforCompiler(targetJsPayload);
                wasmBytes = compileResult.wasm; // Uint8Array
                
                if (wasmBytes && wasmBytes.length > 0) {
                    finalPayloadBase64 = Buffer.from(wasmBytes).toString('base64');
                    isWasm = true;
                    console.log(chalk.green(`[✓] WebAssembly bytecode compilation successful (${wasmBytes.length} bytes).`));
                    
                    // Log compilation stats
                    if (compileResult.pages) {
                        console.log(chalk.blue(`[i] Wasm memory pages: ${compileResult.pages.size}`));
                    }
                    if (compileResult.funcs) {
                        console.log(chalk.blue(`[i] Functions compiled: ${compileResult.funcs.length}`));
                    }
                } else {
                    throw new Error('Porffor returned empty Wasm binary');
                }
            } catch (wasmError) {
                console.log(chalk.yellow(`[!] Porffor compilation failed: ${wasmError.message}`));
                console.log(chalk.yellow('[!] Activating Safe-Fallback Mode (JS obfuscation only).'));
                finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
                isWasm = false;
            }
        } else {
            // Safe Fallback Mode
            if (options.analyzeOnly) {
                console.log(chalk.cyan('[i] Analysis complete. Exiting without compilation.'));
                process.exit(0);
            }
            finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
            console.log(chalk.blue('[i] Using Safe-Fallback Mode: Maximum obfuscation, no Wasm.'));
        }

        // 5. Distribution Architecture (Denuvo-style chunking)
        const partCount = parseInt(options.parts) || 5;
        const chunkSize = Math.ceil(finalPayloadBase64.length / partCount);
        const chunks = [];

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
            
            // More stealthy hiding - use CSS class instead of inline styles
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
            minifyJS: false, // Don't minify our already-obfuscated JS
            removeComments: true,
            keepClosingSlash: true,
        });

        const outputDir = path.dirname(options.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(options.output, minifiedHtml, 'utf8');
        console.log(chalk.green.bold(`[✓] Dontrea pipeline successfully compiled. Output file: ${options.output}\n`));
        
        // Summary
        const modeStr = isWasm 
            ? `WebAssembly (Porffor AOT via ${porfforSource})` 
            : 'JS Obfuscation (Safe-Fallback)';
        console.log(chalk.cyan('┌─────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│           DONTREA PROTECTION SUMMARY        │'));
        console.log(chalk.cyan('├─────────────────────────────────────────────┤'));
        console.log(chalk.cyan(`│ Mode: ${modeStr.padEnd(41)} │`));
        console.log(chalk.cyan(`│ Chunks: ${String(partCount).padStart(2)} │ Parts: ${String(chunks.length).padStart(2)} │ Payload: ${String(finalPayloadBase64.length).padStart(6)} chars │`));
        if (compatIssues.length > 0) {
            console.log(chalk.cyan(`│ Compat Issues: ${String(compatIssues.length).padStart(2)} (${compatIssues.map(i => i.name).join(', ')}) │`));
        }
        console.log(chalk.cyan('└─────────────────────────────────────────────┘\n'));
        
    } catch (minifyError) {
        console.error(chalk.red(`[-] Minification failed: ${minifyError.message}`));
        fs.writeFileSync(options.output, processedHtml, 'utf8');
    }
}

runPipeline();