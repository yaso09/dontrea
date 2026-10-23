#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const cheerio = require('cheerio');
const chalk = require('chalk');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('html-minifier-terser');

// Porffor dynamic load simulate or direct call
let porffor;
try {
    porffor = require('porffor');
} catch (e) {
    // Porffor environment handling
}

// CLI Config
program
    .name('dontrea')
    .description('Dontrea: Denuvo-style advanced HTML/JS protection pipeline')
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
    .option('--domain-lock <domains...>', 'Lock execution to specific domains');

program.parse(process.argv);
const options = program.opts();

async function runPipeline() {
    console.log(chalk.cyan.bold('\n🛡️  Dontrea Anti-Piracy Protection Pipeline starting...'));
    
    if (!fs.existsSync(options.input)) {
        console.error(chalk.red(`[-] Error: Input file not found at ${options.input}`));
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(options.input, 'utf8');
    const $ = cheerio.load(htmlContent);

    // Keep the document explicitly UTF-8 so Turkish characters and emoji render correctly.
    if (!$('head').length) $('html').prepend('<head></head>');
    const existingCharset = $('meta[charset]').first();
    if (existingCharset.length) {
        existingCharset.remove();
    }
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

        // 2. JavaScript Obfuscation Config Building
        const obfuscatorConfig = {
            compact: true,
            numbersToExpressions: true,
            stringArray: true,
            stringArrayThreshold: 0.8,
            controlFlowFlattening: options.controlFlowFlattening === 'true',
            controlFlowFlatteningThreshold: parseFloat(options.controlFlowFlatteningThreshold),
            deadCodeInjection: options.deadCodeInjection === 'true',
            debugProtection: options.debugProtection === 'true',
            debugProtectionInterval: parseInt(options.debugProtectionInterval),
            selfDefending: options.selfDefending === 'true'
        };

        if (options.domainLock && options.domainLock.length > 0) {
            obfuscatorConfig.domainLock = options.domainLock;
            console.log(chalk.blue(`[+] Domain lock activated for: ${options.domainLock.join(', ')}`));
        }

        console.log(chalk.green(`[+] Obfuscating JavaScript payload...`));
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(combinedJsCode, obfuscatorConfig);
        const targetJsPayload = obfuscatedResult.getObfuscatedCode();

        // 3. Porffor compilation layer (Wasm integration)
        let finalPayloadBase64 = "";
        let isWasm = false;

        if (porffor && typeof porffor.compile === 'function') {
            try {
                console.log(chalk.green(`[+] Compiling obfuscated JavaScript to WebAssembly via Porffor AOT...`));
                const wasmBuffer = porffor.compile(targetJsPayload);
                finalPayloadBase64 = wasmBuffer.toString('base64');
                isWasm = true;
                console.log(chalk.green(`[✓] WebAssembly bytecode compilation successful.`));
            } catch (wasmError) {
                console.log(chalk.yellow(`[!] Porffor compilation warning (DOM/Experimental limit). Activating Safe-Fallback Mode.`));
                finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
            }
        } else {
            // Safe Fallback Mode
            finalPayloadBase64 = Buffer.from(targetJsPayload).toString('base64');
        }

        // 4. Distribution Architecture (Denuvo-style)
        const partCount = parseInt(options.parts) || 5;
        const chunkSize = Math.ceil(finalPayloadBase64.length / partCount);
        const chunks = [];

        for (let i = 0; i < finalPayloadBase64.length; i += chunkSize) {
            chunks.push(finalPayloadBase64.substring(i, i + chunkSize));
        }

        console.log(chalk.green(`[+] Distributing payload into ${chunks.length} hidden structural segments...`));

        const hiddenSelectors = [];
        const HTML_TAGS = ['div', 'span', 'p'];

        chunks.forEach((chunk, index) => {
            const randomTag = HTML_TAGS[Math.floor(Math.random() * HTML_TAGS.length)];
            const elementId = `dontrea-_0x${Math.random().toString(16).substring(2, 6)}`;
            const attrName = `data-node-_0x${Math.random().toString(16).substring(2, 6)}`;
            
            $('body').append(`<${randomTag} id="${elementId}" ${attrName}="${chunk}" style="display:none; visibility:hidden; position:absolute; z-index:-999;"></${randomTag}>`);
            hiddenSelectors.push({ id: elementId, attr: attrName });
        });

        // 5. High-Security Bootstrap Loader Injection
        const bootstrapLoader = `
            <script>
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
                                const { instance } = await WebAssembly.instantiate(binary, {
                                    console: { log: console.log }
                                });
                                if (instance.exports.main) instance.exports.main();
                            } else {
                                // atob() returns a binary/Latin-1 string, not UTF-8 text.
                                // Decode the Base64 bytes as UTF-8 before evaluating JavaScript.
                                const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
                                const decodedJs = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                                (0, eval)(decodedJs);
                            }
                        } catch(err) {}
                    });
                })();
            </script>
        `;

        // Obfuscate the bootstrap loader as well for maximum resistance
        const secureLoader = JavaScriptObfuscator.obfuscate(bootstrapLoader.replace('<script>', '').replace('</script>', ''), {
            compact: true,
            selfDefending: true,
            debugProtection: options.debugProtection === 'true'
        }).getObfuscatedCode();

        $('body').append(`<script>${secureLoader}</script>`);
    }

    // 6. HTML Minification
    console.log(chalk.green(`[+] Executing structural HTML compression and minification...`));
    const processedHtml = $.html();
    
    try {
        const minifiedHtml = await minify(processedHtml, {
            removeAttributeQuotes: false,
            collapseWhitespace: true,
            minifyCSS: true,
            removeComments: true
        });

        const outputDir = path.dirname(options.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(options.output, minifiedHtml, 'utf8');
        console.log(chalk.green.bold(`[✓] Dontrea pipeline successfully compiled. Output file: ${options.output}\n`));
    } catch (minifyError) {
        console.error(chalk.red(`[-] Minification failed: ${minifyError.message}`));
        fs.writeFileSync(options.output, processedHtml, 'utf8');
    }
}

runPipeline();
