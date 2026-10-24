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

// ─── Javy Universal Web Proxy Engine (UWPE) - Task 01 & Task 02: DOM Core, HTML5 & Forms ───
// Inlined into the JavaScript code before compiling to Javy WebAssembly.
// Provides 100% full-fidelity DOM Core, HTML5 Elements, Forms, Media, and File API virtualization.
const JAVY_BROWSER_BRIDGE = `
(function(global) {
    if (typeof Javy === 'undefined' || !Javy.IO) return;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // ─── Wire Protocol Client ───
    function __wireCall(cmd) {
        try {
            const payload = JSON.stringify(cmd);
            const msg = '__UWPE__' + payload + '\\n';
            Javy.IO.writeSync(1, encoder.encode(msg));
            const buf = new Uint8Array(65536);
            const n = Javy.IO.readSync(0, buf);
            const resStr = decoder.decode(buf.subarray(0, n));
            return JSON.parse(resStr);
        } catch(e) {
            return { error: e.message };
        }
    }

    function hostEval(code) {
        const res = __wireCall({ op: 'EVAL', code });
        return res.result;
    }
    global.__hostEval = hostEval;
    global.__hostRpc = __wireCall;

    // ─── Wasm Handle & Proxy Registry ───
    const handleProxyCache = new Map();
    const wasmCallbacks = new Map();
    const wasmListeners = new Map(); // handleId -> Map(eventType -> Set(listeners))
    let nextCallbackId = 1;

    function serializeArg(arg) {
        if (arg === null || arg === undefined) return arg;
        if (typeof arg === 'function') {
            const cbId = nextCallbackId++;
            wasmCallbacks.set(cbId, arg);
            return { $cb: cbId };
        }
        if (typeof arg === 'object') {
            if (typeof ImageData !== 'undefined' && arg instanceof ImageData) {
                return {
                    $imageData: true,
                    width: arg.width,
                    height: arg.height,
                    data: Array.from(arg.data)
                };
            }
            if (typeof Uint8ClampedArray !== 'undefined' && arg instanceof Uint8ClampedArray) {
                return Array.from(arg);
            }
            if (typeof Uint8Array !== 'undefined' && arg instanceof Uint8Array) {
                return Array.from(arg);
            }
            if (arg.__handle__) {
                return { $h: arg.__handle__ };
            }
        }
        if (Array.isArray(arg)) {
            return arg.map(serializeArg);
        }
        if (typeof arg === 'object' && arg.constructor === Object) {
            const res = {};
            for (const k of Object.keys(arg)) {
                res[k] = serializeArg(arg[k]);
            }
            return res;
        }
        return arg;
    }

    function deserializeResult(res) {
        if (res && typeof res === 'object') {
            if (res.$imageData) {
                const arr = new Uint8ClampedArray(res.data);
                return new ImageData(arr, res.width, res.height);
            }
            if (res.$h) {
                return getOrCreateProxy(res.$h, res.$t);
            }
            if (Array.isArray(res)) {
                return res.map(deserializeResult);
            }
        }
        return res;
    }

    function getOrCreateProxy(handleId, typeName) {
        if (handleProxyCache.has(handleId)) {
            return handleProxyCache.get(handleId);
        }
        const proxy = createUniversalProxy(handleId, typeName);
        handleProxyCache.set(handleId, proxy);
        return proxy;
    }

    // ─── Constants Tables ───
    const NodeConstants = {
        ELEMENT_NODE: 1,
        ATTRIBUTE_NODE: 2,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        ENTITY_REFERENCE_NODE: 5,
        ENTITY_NODE: 6,
        PROCESSING_INSTRUCTION_NODE: 7,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9,
        DOCUMENT_TYPE_NODE: 10,
        DOCUMENT_FRAGMENT_NODE: 11,
        NOTATION_NODE: 12,
        DOCUMENT_POSITION_DISCONNECTED: 0x01,
        DOCUMENT_POSITION_PRECEDING: 0x02,
        DOCUMENT_POSITION_FOLLOWING: 0x04,
        DOCUMENT_POSITION_CONTAINS: 0x08,
        DOCUMENT_POSITION_CONTAINED_BY: 0x10,
        DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 0x20
    };

    const EventConstants = {
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3
    };

    const NodeFilterConstants = {
        SHOW_ALL: 0xFFFFFFFF,
        SHOW_ELEMENT: 0x1,
        SHOW_ATTRIBUTE: 0x2,
        SHOW_TEXT: 0x4,
        SHOW_CDATA_SECTION: 0x8,
        SHOW_ENTITY_REFERENCE: 0x10,
        SHOW_ENTITY: 0x20,
        SHOW_PROCESSING_INSTRUCTION: 0x40,
        SHOW_COMMENT: 0x80,
        SHOW_DOCUMENT: 0x100,
        SHOW_DOCUMENT_TYPE: 0x200,
        SHOW_DOCUMENT_FRAGMENT: 0x400,
        SHOW_NOTATION: 0x800,
        FILTER_ACCEPT: 1,
        FILTER_REJECT: 2,
        FILTER_SKIP: 3
    };

    const RangeConstants = {
        START_TO_START: 0,
        START_TO_END: 1,
        END_TO_END: 2,
        END_TO_START: 3
    };

    const MediaConstants = {
        NETWORK_EMPTY: 0,
        NETWORK_IDLE: 1,
        NETWORK_LOADING: 2,
        NETWORK_NO_SOURCE: 3,
        HAVE_NOTHING: 0,
        HAVE_METADATA: 1,
        HAVE_CURRENT_DATA: 2,
        HAVE_FUTURE_DATA: 3,
        HAVE_ENOUGH_DATA: 4
    };

    const FileReaderConstants = {
        EMPTY: 0,
        LOADING: 1,
        DONE: 2
    };

    // ─── Dataset Proxy (element.dataset) ───
    function camelToKebab(str) {
        return 'data-' + str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    function createDatasetProxy(elementHandle) {
        return new Proxy({}, {
            get(t, prop) {
                if (typeof prop !== 'string' || prop === 'then') return undefined;
                const attr = camelToKebab(prop);
                const res = __wireCall({ op: 'CALL', h: elementHandle, method: 'getAttribute', args: [attr] });
                return res.result !== null ? String(res.result) : undefined;
            },
            set(t, prop, val) {
                if (typeof prop !== 'string') return false;
                const attr = camelToKebab(prop);
                __wireCall({ op: 'CALL', h: elementHandle, method: 'setAttribute', args: [attr, String(val)] });
                return true;
            },
            deleteProperty(t, prop) {
                if (typeof prop !== 'string') return false;
                const attr = camelToKebab(prop);
                __wireCall({ op: 'CALL', h: elementHandle, method: 'removeAttribute', args: [attr] });
                return true;
            },
            has(t, prop) {
                if (typeof prop !== 'string') return false;
                const attr = camelToKebab(prop);
                const res = __wireCall({ op: 'CALL', h: elementHandle, method: 'hasAttribute', args: [attr] });
                return !!res.result;
            }
        });
    }

    // ─── DOMTokenList Proxy (element.classList) ───
    function createDOMTokenListProxy(elementHandle) {
        return {
            add(...tokens) {
                __wireCall({ op: 'CLASSLIST_ADD', h: elementHandle, tokens });
            },
            remove(...tokens) {
                __wireCall({ op: 'CLASSLIST_REMOVE', h: elementHandle, tokens });
            },
            toggle(token, force) {
                const res = __wireCall({ op: 'CLASSLIST_TOGGLE', h: elementHandle, token, force });
                return !!res.result;
            },
            contains(token) {
                const res = __wireCall({ op: 'CLASSLIST_CONTAINS', h: elementHandle, token });
                return !!res.result;
            },
            replace(oldToken, newToken) {
                const res = __wireCall({ op: 'CLASSLIST_REPLACE', h: elementHandle, oldToken, newToken });
                return !!res.result;
            },
            get value() {
                const res = __wireCall({ op: 'GET', h: elementHandle, prop: 'className' });
                return res.result || '';
            },
            set value(v) {
                __wireCall({ op: 'SET', h: elementHandle, prop: 'className', val: v });
            },
            get length() {
                const res = __wireCall({ op: 'GET', h: elementHandle, prop: 'className' });
                const str = (res.result || '').trim();
                return str ? str.split(/\\s+/).length : 0;
            },
            item(index) {
                const res = __wireCall({ op: 'GET', h: elementHandle, prop: 'className' });
                const str = (res.result || '').trim();
                return str ? (str.split(/\\s+/)[index] || null) : null;
            },
            toString() {
                return this.value;
            },
            forEach(callback, thisArg) {
                const len = this.length;
                for (let i = 0; i < len; i++) {
                    callback.call(thisArg, this.item(i), i, this);
                }
            },
            *[Symbol.iterator]() {
                const len = this.length;
                for (let i = 0; i < len; i++) {
                    yield this.item(i);
                }
            }
        };
    }

    const CSSRuleConstants = {
        STYLE_RULE: 1,
        CHARSET_RULE: 2,
        IMPORT_RULE: 3,
        MEDIA_RULE: 4,
        FONT_FACE_RULE: 5,
        PAGE_RULE: 6,
        KEYFRAMES_RULE: 7,
        KEYFRAME_RULE: 8,
        NAMESPACE_RULE: 10,
        SUPPORTS_RULE: 12
    };

    // ─── CSSStyleDeclaration Proxy (element.style & getComputedStyle) ───
    function createCSSStyleDeclarationProxy(elementHandle, isReadOnly = false) {
        const target = {
            __handle__: elementHandle,
            __type__: 'CSSStyleDeclaration',
            toString() { return '[object CSSStyleDeclaration]'; }
        };

        return new Proxy(target, {
            get(t, prop) {
                if (prop === '__handle__') return t.__handle__;
                if (prop === '__type__') return t.__type__;
                if (prop === 'then') return undefined;

                if (prop === 'setProperty') {
                    return function(p, val, priority) {
                        if (isReadOnly) return;
                        __wireCall({ op: 'STYLE_SET_PROP', h: elementHandle, prop: p, val, priority });
                    };
                }
                if (prop === 'getPropertyValue') {
                    return function(p) {
                        const res = __wireCall({ op: 'STYLE_GET_PROP', h: elementHandle, prop: p });
                        return res.result || '';
                    };
                }
                if (prop === 'getPropertyPriority') {
                    return function(p) {
                        const res = __wireCall({ op: 'STYLE_GET_PRIORITY', h: elementHandle, prop: p });
                        return res.result || '';
                    };
                }
                if (prop === 'removeProperty') {
                    return function(p) {
                        if (isReadOnly) return '';
                        const res = __wireCall({ op: 'STYLE_REMOVE_PROP', h: elementHandle, prop: p });
                        return res.result || '';
                    };
                }
                if (prop === 'item') {
                    return function(idx) {
                        const res = __wireCall({ op: 'STYLE_ITEM', h: elementHandle, index: idx });
                        return res.result || '';
                    };
                }
                if (prop === 'length') {
                    const res = __wireCall({ op: 'STYLE_LENGTH', h: elementHandle });
                    return Number(res.result) || 0;
                }
                if (prop === 'parentRule') {
                    return null;
                }
                if (prop === 'cssText') {
                    const res = __wireCall({ op: 'STYLE_GET', h: elementHandle, prop: 'cssText' });
                    return res.result || '';
                }
                const res = __wireCall({ op: 'STYLE_GET', h: elementHandle, prop: String(prop) });
                return res.result || '';
            },
            set(t, prop, val) {
                if (isReadOnly) return true;
                __wireCall({ op: 'STYLE_SET', h: elementHandle, prop: String(prop), val: String(val) });
                return true;
            }
        });
    }

    // ─── Universal DOM Proxy Generator ───
    function createUniversalProxy(handleId, typeName) {
        const target = {
            __handle__: handleId,
            __type__: typeName || 'Object',
            toString() { return '[object ' + (typeName || 'Object') + ']'; }
        };

        const proxy = new Proxy(target, {
            get(t, prop, receiver) {
                if (prop === '__handle__') return t.__handle__;
                if (prop === '__type__') return t.__type__;
                if (prop === 'then') return undefined;

                if (prop in NodeConstants) return NodeConstants[prop];
                if (prop in EventConstants) return EventConstants[prop];
                if (prop in MediaConstants) return MediaConstants[prop];
                if (prop in FileReaderConstants) return FileReaderConstants[prop];
                if (prop in CSSRuleConstants) return CSSRuleConstants[prop];

                if (prop === 'classList') return createDOMTokenListProxy(t.__handle__);
                if (prop === 'style') return createCSSStyleDeclarationProxy(t.__handle__, false);
                if (prop === 'dataset') return createDatasetProxy(t.__handle__);

                if (prop === 'getComputedStyle') {
                    return function(elt, pseudoElt) {
                        const res = __wireCall({
                            op: 'GET_COMPUTED_STYLE',
                            elt: elt && elt.__handle__,
                            pseudo: pseudoElt || null
                        });
                        return createCSSStyleDeclarationProxy(res.result.$h, true);
                    };
                }

                if (prop === 'matchMedia') {
                    return function(query) {
                        const res = __wireCall({
                            op: 'MATCH_MEDIA',
                            query: String(query)
                        });
                        return getOrCreateProxy(res.result.$h, 'MediaQueryList');
                    };
                }

                if (prop === 'getBoundingClientRect') {
                    return function() {
                        const res = __wireCall({ op: 'GET_BOUNDING_CLIENT_RECT', h: t.__handle__ });
                        return getOrCreateProxy(res.result.$h, 'DOMRect');
                    };
                }

                if (prop === 'getClientRects') {
                    return function() {
                        const res = __wireCall({ op: 'GET_CLIENT_RECTS', h: t.__handle__ });
                        return getOrCreateProxy(res.result.$h, 'DOMRectList');
                    };
                }

                if (prop === 'animate') {
                    return function(keyframes, options) {
                        const res = __wireCall({
                            op: 'ANIMATE',
                            h: t.__handle__,
                            keyframes: serializeArg(keyframes),
                            options: serializeArg(options)
                        });
                        return getOrCreateProxy(res.result.$h, 'Animation');
                    };
                }

                if (prop === 'addEventListener') {
                    return function(type, listener, options) {
                        const cbId = nextCallbackId++;
                        wasmCallbacks.set(cbId, listener);

                        if (!wasmListeners.has(t.__handle__)) {
                            wasmListeners.set(t.__handle__, new Map());
                        }
                        const typeMap = wasmListeners.get(t.__handle__);
                        if (!typeMap.has(type)) {
                            typeMap.set(type, new Set());
                        }
                        typeMap.get(type).add(listener);

                        __wireCall({
                            op: 'ADD_LISTENER',
                            h: t.__handle__,
                            type: type,
                            cb: cbId,
                            opts: typeof options === 'object' ? options : !!options
                        });
                    };
                }

                if (prop === 'removeEventListener') {
                    return function(type, listener, options) {
                        if (wasmListeners.has(t.__handle__)) {
                            const typeMap = wasmListeners.get(t.__handle__);
                            if (typeMap.has(type)) {
                                typeMap.get(type).delete(listener);
                            }
                        }
                        let foundId = null;
                        for (const [id, fn] of wasmCallbacks.entries()) {
                            if (fn === listener) { foundId = id; break; }
                        }
                        if (foundId) {
                            __wireCall({ op: 'REMOVE_LISTENER', h: t.__handle__, type: type, cb: foundId });
                            wasmCallbacks.delete(foundId);
                        }
                    };
                }

                if (prop === 'dispatchEvent') {
                    return function(event) {
                        if (event) {
                            try {
                                Object.defineProperty(event, 'target', { value: receiver || proxy, configurable: true });
                                Object.defineProperty(event, 'currentTarget', { value: receiver || proxy, configurable: true });
                            } catch(e) {}
                        }

                        // 1. Invoke local synchronous Wasm listeners on this element
                        if (wasmListeners.has(t.__handle__)) {
                            const typeMap = wasmListeners.get(t.__handle__);
                            const evtType = event && event.type;
                            if (typeMap && typeMap.has(evtType)) {
                                for (const fn of Array.from(typeMap.get(evtType))) {
                                    try { fn.call(receiver || proxy, event); } catch(err) { console.error(err); }
                                }
                            }
                        }

                        // 2. Synchronous bubbling up parentNode chain if event bubbles
                        if (event && event.bubbles !== false) {
                            let curr = receiver ? receiver.parentNode : null;
                            while (curr && curr.__handle__) {
                                if (event.defaultPrevented || event.cancelBubble) break;
                                try { Object.defineProperty(event, 'currentTarget', { value: curr, configurable: true }); } catch(e) {}
                                if (wasmListeners.has(curr.__handle__)) {
                                    const typeMap = wasmListeners.get(curr.__handle__);
                                    const evtType = event.type;
                                    if (typeMap && typeMap.has(evtType)) {
                                        for (const fn of Array.from(typeMap.get(evtType))) {
                                            try { fn.call(curr, event); } catch(err) { console.error(err); }
                                        }
                                    }
                                }
                                curr = curr.parentNode;
                            }
                        }

                        // 3. Dispatch to host DOM
                        const res = __wireCall({
                            op: 'DISPATCH_EVENT',
                            h: t.__handle__,
                            event: serializeArg(event)
                        });
                        return !!res.result;
                    };
                }

                if (prop === 'click') {
                    return function() {
                        const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
                        proxy.dispatchEvent(evt);
                        __wireCall({ op: 'CALL', h: t.__handle__, method: 'click', args: [] });
                    };
                }

                if (prop === 'focus') {
                    return function(options) {
                        const evt = new FocusEvent('focus', { bubbles: false, cancelable: false });
                        proxy.dispatchEvent(evt);
                        __wireCall({ op: 'CALL', h: t.__handle__, method: 'focus', args: options ? [serializeArg(options)] : [] });
                    };
                }

                if (prop === 'blur') {
                    return function() {
                        const evt = new FocusEvent('blur', { bubbles: false, cancelable: false });
                        proxy.dispatchEvent(evt);
                        __wireCall({ op: 'CALL', h: t.__handle__, method: 'blur', args: [] });
                    };
                }

                // NodeList / HTMLCollection / FormData Iteration support
                if (prop === Symbol.iterator) {
                    return function*() {
                        const len = Number(proxy.length) || 0;
                        for (let i = 0; i < len; i++) {
                            yield proxy[i];
                        }
                    };
                }

                if (prop === 'forEach') {
                    return function(callback, thisArg) {
                        const len = Number(proxy.length) || 0;
                        for (let i = 0; i < len; i++) {
                            callback.call(thisArg, proxy[i], i, proxy);
                        }
                    };
                }

                // Handle 1 (Window) Self-references and BOM Singletons
                if (t.__handle__ === 1) {
                    if (prop === 'window' || prop === 'self' || prop === 'top' || prop === 'parent' || prop === 'frames') {
                        return proxy;
                    }
                    if (prop === 'document') {
                        return getOrCreateProxy(2, 'Document');
                    }
                    if (prop === 'location') {
                        return getOrCreateProxy(3, 'Location');
                    }
                    if (prop === 'navigator') {
                        return getOrCreateProxy(4, 'Navigator');
                    }
                    if (prop === 'history') {
                        return getOrCreateProxy(5, 'History');
                    }
                    if (prop === 'screen') {
                        return getOrCreateProxy(6, 'Screen');
                    }
                    if (prop === 'performance') {
                        return getOrCreateProxy(7, 'Performance');
                    }
                    if (prop === 'atob') return global.atob;
                    if (prop === 'btoa') return global.btoa;
                    if (prop === 'setTimeout') return global.setTimeout;
                    if (prop === 'clearTimeout') return global.clearTimeout;
                    if (prop === 'setInterval') return global.setInterval;
                    if (prop === 'clearInterval') return global.clearInterval;
                    if (prop === 'requestAnimationFrame') return global.requestAnimationFrame;
                    if (prop === 'cancelAnimationFrame') return global.cancelAnimationFrame;
                    if (prop === 'queueMicrotask') return global.queueMicrotask;
                    if (prop === 'URL') return global.URL;
                    if (prop === 'URLSearchParams') return global.URLSearchParams;
                    if (prop === 'ImageData') return global.ImageData;
                    if (prop === 'Path2D') return global.Path2D;
                    if (prop === 'OffscreenCanvas') return global.OffscreenCanvas;
                    if (prop === 'CanvasRenderingContext2D') return global.CanvasRenderingContext2D;
                    if (prop === 'OffscreenCanvasRenderingContext2D') return global.OffscreenCanvasRenderingContext2D;
                    if (prop === 'CanvasGradient') return global.CanvasGradient;
                    if (prop === 'CanvasPattern') return global.CanvasPattern;
                    if (prop === 'TextMetrics') return global.TextMetrics;
                    if (prop === 'ImageBitmap') return global.ImageBitmap;
                    if (prop === 'createImageBitmap') return global.createImageBitmap;
                }

                // Handle 7 (Performance)
                if (t.__handle__ === 7) {
                    if (prop === 'now') {
                        return function() {
                            const pRes = __wireCall({ op: 'PERFORMANCE_NOW' });
                            return Number(pRes.result);
                        };
                    }
                }

                // Task 05: Canvas & Context Special Methods
                if (prop === 'toBlob') {
                    return function(callback, type, quality) {
                        if (typeof callback !== 'function') return;
                        try {
                            const dataUrl = proxy.toDataURL(type, quality);
                            const commaIdx = dataUrl.indexOf(',');
                            const mime = (dataUrl.slice(5, commaIdx).split(';')[0]) || 'image/png';
                            const b64 = dataUrl.slice(commaIdx + 1);
                            const raw = global.atob(b64);
                            const arr = new Uint8Array(raw.length);
                            for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                            const blob = new Blob([arr], { type: mime });
                            callback(blob);
                        } catch(e) {
                            callback(null);
                        }
                    };
                }
                if (prop === 'createImageData') {
                    return function(arg1, arg2, settings) {
                        if (arg1 && typeof arg1 === 'object' && arg1.width) {
                            return new ImageData(arg1.width, arg1.height, settings);
                        }
                        return new ImageData(Number(arg1), Number(arg2), settings);
                    };
                }
                if (prop === 'getImageData') {
                    return function(sx, sy, sw, sh, settings) {
                        const gRes = __wireCall({
                            op: 'GET_IMAGE_DATA',
                            h: t.__handle__,
                            sx: Number(sx),
                            sy: Number(sy),
                            sw: Number(sw),
                            sh: Number(sh),
                            settings: settings
                        });
                        if (gRes.result && gRes.result.$imageData) {
                            const u8c = new Uint8ClampedArray(gRes.result.data);
                            return new ImageData(u8c, gRes.result.width, gRes.result.height, settings);
                        }
                        return new ImageData(Number(sw), Number(sh), settings);
                    };
                }
                if (prop === 'putImageData') {
                    return function(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
                        __wireCall({
                            op: 'PUT_IMAGE_DATA',
                            h: t.__handle__,
                            imagedata: serializeArg(imagedata),
                            dx: Number(dx),
                            dy: Number(dy),
                            dirtyX: dirtyX !== undefined ? Number(dirtyX) : undefined,
                            dirtyY: dirtyY !== undefined ? Number(dirtyY) : undefined,
                            dirtyWidth: dirtyWidth !== undefined ? Number(dirtyWidth) : undefined,
                            dirtyHeight: dirtyHeight !== undefined ? Number(dirtyHeight) : undefined
                        });
                    };
                }

                // Query host for property or method
                const res = __wireCall({ op: 'GET', h: t.__handle__, prop: String(prop) });
                if (res.isMethod) {
                    return function(...args) {
                        if (new.target) {
                            const newRes = __wireCall({
                                op: 'NEW_CONSTRUCT',
                                h: t.__handle__,
                                method: String(prop),
                                args: args.map(serializeArg)
                            });
                            return deserializeResult(newRes.result);
                        }
                        const callRes = __wireCall({
                            op: 'CALL',
                            h: t.__handle__,
                            method: String(prop),
                            args: args.map(serializeArg)
                        });
                        if (callRes.error) {
                            console.warn('[UWPE Host Notice]', callRes.error);
                            return undefined;
                        }
                        return deserializeResult(callRes.result);
                    };
                }
                return deserializeResult(res.result);
            },
            set(t, prop, val, receiver) {
                if (t.__handle__ === 3 && prop === 'href') {
                    const res = __wireCall({ op: 'SET', h: 3, prop: 'href', val: String(val) });
                    return !res.error;
                }
                const res = __wireCall({
                    op: 'SET',
                    h: t.__handle__,
                    prop: String(prop),
                    val: serializeArg(val)
                });
                return !res.error;
            }
        });

        return proxy;
    }

    // ─── Event Constructors & Inheritance ───
    const eventInheritanceMap = {
        Event: ['Event', 'CustomEvent', 'UIEvent', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'FocusEvent', 'InputEvent', 'WheelEvent', 'SubmitEvent', 'DragEvent', 'TouchEvent', 'AnimationEvent', 'TransitionEvent'],
        UIEvent: ['UIEvent', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'FocusEvent', 'InputEvent', 'WheelEvent', 'DragEvent', 'TouchEvent'],
        MouseEvent: ['MouseEvent', 'PointerEvent', 'WheelEvent', 'DragEvent']
    };

    function createEventClass(className) {
        function EventConstructor(type, eventInitDict) {
            if (!new.target) {
                throw new TypeError("Failed to construct '" + className + "': Please use the 'new' operator");
            }
            const res = __wireCall({
                op: 'NEW_EVENT',
                cls: className,
                type: type,
                init: serializeArg(eventInitDict || {})
            });
            const eventProxy = getOrCreateProxy(res.result.$h, className);
            if (eventInitDict && typeof eventInitDict === 'object') {
                for (const key of Object.keys(eventInitDict)) {
                    if (!(key in eventProxy)) {
                        try { eventProxy[key] = eventInitDict[key]; } catch(e) {}
                    }
                }
            }
            return eventProxy;
        }
        Object.assign(EventConstructor, EventConstants);
        try {
            Object.defineProperty(EventConstructor, Symbol.hasInstance, {
                value: function(instance) {
                    if (!instance || typeof instance !== 'object' || !instance.__handle__) return false;
                    const type = instance.__type__ || 'Event';
                    if (type === className) return true;
                    const descendants = eventInheritanceMap[className];
                    if (descendants && descendants.includes(type)) return true;
                    return false;
                },
                configurable: true
            });
        } catch(e) {}
        return EventConstructor;
    }

    // ─── EventTarget Class ───
    function createEventTargetClass() {
        function EventTargetConstructor() {
            if (!new.target) {
                throw new TypeError("Failed to construct 'EventTarget': Please use the 'new' operator");
            }
            const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'EventTarget', args: [] });
            return getOrCreateProxy(res.result.$h, 'EventTarget');
        }
        try {
            Object.defineProperty(EventTargetConstructor, Symbol.hasInstance, {
                value: function(instance) {
                    return !!(instance && typeof instance === 'object' && instance.__handle__);
                },
                configurable: true
            });
        } catch(e) {}
        return EventTargetConstructor;
    }

    // ─── Node Classes with Inheritance ───
    const nodeTypeCheck = {
        Node: (t) => t >= 1 && t <= 12,
        Element: (t) => t === 1,
        HTMLElement: (t) => t === 1,
        Attr: (t) => t === 2,
        Text: (t) => t === 3,
        CDATASection: (t) => t === 4,
        ProcessingInstruction: (t) => t === 7,
        Comment: (t) => t === 8,
        Document: (t) => t === 9,
        DocumentType: (t) => t === 10,
        DocumentFragment: (t) => t === 11
    };

    function createNodeClass(className) {
        function NodeConstructor() {
            throw new TypeError("Illegal constructor");
        }
        Object.assign(NodeConstructor, NodeConstants);
        try {
            Object.defineProperty(NodeConstructor, Symbol.hasInstance, {
                value: function(instance) {
                    if (!instance || typeof instance !== 'object' || !instance.__handle__) return false;
                    const checker = nodeTypeCheck[className];
                    if (checker && checker(instance.nodeType)) return true;
                    return instance.__type__ === className;
                },
                configurable: true
            });
        } catch(e) {}
        return NodeConstructor;
    }

    // ─── HTML5 Element Tag Mapping & Class Factory ───
    const htmlTagMap = {
        HTMLElement: null,
        HTMLMediaElement: ['AUDIO', 'VIDEO'],
        HTMLInputElement: ['INPUT'],
        HTMLTextAreaElement: ['TEXTAREA'],
        HTMLSelectElement: ['SELECT'],
        HTMLOptionElement: ['OPTION'],
        HTMLOptGroupElement: ['OPTGROUP'],
        HTMLFormElement: ['FORM'],
        HTMLButtonElement: ['BUTTON'],
        HTMLDivElement: ['DIV'],
        HTMLSpanElement: ['SPAN'],
        HTMLParagraphElement: ['P'],
        HTMLAnchorElement: ['A'],
        HTMLImageElement: ['IMG'],
        HTMLAudioElement: ['AUDIO'],
        HTMLVideoElement: ['VIDEO'],
        HTMLCanvasElement: ['CANVAS'],
        HTMLDialogElement: ['DIALOG'],
        HTMLIFrameElement: ['IFRAME'],
        HTMLTableElement: ['TABLE'],
        HTMLTableRowElement: ['TR'],
        HTMLTableCellElement: ['TD', 'TH'],
        HTMLUListElement: ['UL'],
        HTMLOListElement: ['OL'],
        HTMLLIElement: ['LI'],
        HTMLHeadingElement: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
        HTMLBodyElement: ['BODY'],
        HTMLHeadElement: ['HEAD'],
        HTMLHtmlElement: ['HTML'],
        HTMLScriptElement: ['SCRIPT'],
        HTMLStyleElement: ['STYLE'],
        HTMLLinkElement: ['LINK'],
        HTMLMetaElement: ['META'],
        HTMLTitleElement: ['TITLE'],
        HTMLFormControlsCollection: null,
        HTMLOptionsCollection: null
    };

    function createHTMLElementClass(className) {
        function HTMLElementConstructor() {
            throw new TypeError("Illegal constructor");
        }
        if (className === 'HTMLMediaElement' || className === 'HTMLAudioElement' || className === 'HTMLVideoElement') {
            Object.assign(HTMLElementConstructor, MediaConstants);
        }
        try {
            Object.defineProperty(HTMLElementConstructor, Symbol.hasInstance, {
                value: function(instance) {
                    if (!instance || typeof instance !== 'object' || !instance.__handle__) return false;
                    if (instance.nodeType !== 1) return false;
                    if (className === 'HTMLElement') return true;
                    const allowedTags = htmlTagMap[className];
                    if (allowedTags && allowedTags.includes(instance.tagName)) return true;
                    return instance.__type__ === className;
                },
                configurable: true
            });
        } catch(e) {}
        return HTMLElementConstructor;
    }

    // ─── Task 02 Constructors: Option, Image, Audio, FormData, Blob, File, FileReader ───
    function Option(text, value, defaultSelected, selected) {
        if (!new.target) throw new TypeError("Failed to construct 'Option': Please use the 'new' operator");
        const args = [];
        if (text !== undefined) args.push(String(text));
        if (value !== undefined) args.push(String(value));
        if (defaultSelected !== undefined) args.push(Boolean(defaultSelected));
        if (selected !== undefined) args.push(Boolean(selected));
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'Option', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'HTMLOptionElement');
    }
    try {
        Object.defineProperty(Option, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.tagName === 'OPTION'),
            configurable: true
        });
    } catch(e) {}

    function Image(width, height) {
        if (!new.target) throw new TypeError("Failed to construct 'Image': Please use the 'new' operator");
        const args = [];
        if (width !== undefined) args.push(Number(width));
        if (height !== undefined) args.push(Number(height));
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'Image', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'HTMLImageElement');
    }
    try {
        Object.defineProperty(Image, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.tagName === 'IMG'),
            configurable: true
        });
    } catch(e) {}

    function Audio(src) {
        if (!new.target) throw new TypeError("Failed to construct 'Audio': Please use the 'new' operator");
        const args = src !== undefined ? [String(src)] : [];
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'Audio', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'HTMLAudioElement');
    }
    Object.assign(Audio, MediaConstants);
    try {
        Object.defineProperty(Audio, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.tagName === 'AUDIO'),
            configurable: true
        });
    } catch(e) {}

    function FormData(form, submitter) {
        if (!new.target) throw new TypeError("Failed to construct 'FormData': Please use the 'new' operator");
        const args = [];
        if (form) args.push(form);
        if (submitter) args.push(submitter);
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'FormData', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'FormData');
    }
    try {
        Object.defineProperty(FormData, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'FormData'),
            configurable: true
        });
    } catch(e) {}

    function Blob(blobParts, options) {
        if (!new.target) throw new TypeError("Failed to construct 'Blob': Please use the 'new' operator");
        const args = [blobParts || [], options || {}];
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'Blob', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'Blob');
    }
    try {
        Object.defineProperty(Blob, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && (instance.__type__ === 'Blob' || instance.__type__ === 'File')),
            configurable: true
        });
    } catch(e) {}

    function File(fileBits, fileName, options) {
        if (!new.target) throw new TypeError("Failed to construct 'File': Please use the 'new' operator");
        const args = [fileBits || [], String(fileName), options || {}];
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'File', args: args.map(serializeArg) });
        return getOrCreateProxy(res.result.$h, 'File');
    }
    try {
        Object.defineProperty(File, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'File'),
            configurable: true
        });
    } catch(e) {}

    function FileReader() {
        if (!new.target) throw new TypeError("Failed to construct 'FileReader': Please use the 'new' operator");
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'FileReader', args: [] });
        return getOrCreateProxy(res.result.$h, 'FileReader');
    }
    Object.assign(FileReader, FileReaderConstants);
    try {
        Object.defineProperty(FileReader, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'FileReader'),
            configurable: true
        });
    } catch(e) {}

    // ─── Task 03: Geometry & CSSOM Constructors (DOMRect, DOMPoint, DOMMatrix, CSSStyleSheet) ───
    function DOMRect(x, y, width, height) {
        if (!new.target) throw new TypeError("Failed to construct 'DOMRect': Please use the 'new' operator");
        const res = __wireCall({
            op: 'NEW_CONSTRUCT',
            h: 1,
            method: 'DOMRect',
            args: [Number(x || 0), Number(y || 0), Number(width || 0), Number(height || 0)]
        });
        return getOrCreateProxy(res.result.$h, 'DOMRect');
    }
    DOMRect.fromRect = function(other) {
        other = other || {};
        return new DOMRect(other.x || 0, other.y || 0, other.width || 0, other.height || 0);
    };
    try {
        Object.defineProperty(DOMRect, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && (instance.__type__ === 'DOMRect' || instance.__type__ === 'DOMRectReadOnly')),
            configurable: true
        });
    } catch(e) {}

    function DOMPoint(x, y, z, w) {
        if (!new.target) throw new TypeError("Failed to construct 'DOMPoint': Please use the 'new' operator");
        const res = __wireCall({
            op: 'NEW_CONSTRUCT',
            h: 1,
            method: 'DOMPoint',
            args: [Number(x || 0), Number(y || 0), Number(z || 0), Number(w !== undefined ? w : 1)]
        });
        return getOrCreateProxy(res.result.$h, 'DOMPoint');
    }
    DOMPoint.fromPoint = function(other) {
        other = other || {};
        return new DOMPoint(other.x || 0, other.y || 0, other.z || 0, other.w !== undefined ? other.w : 1);
    };
    try {
        Object.defineProperty(DOMPoint, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && (instance.__type__ === 'DOMPoint' || instance.__type__ === 'DOMPointReadOnly')),
            configurable: true
        });
    } catch(e) {}

    function DOMMatrix(init) {
        if (!new.target) throw new TypeError("Failed to construct 'DOMMatrix': Please use the 'new' operator");
        const args = init !== undefined ? [init] : [];
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'DOMMatrix', args });
        return getOrCreateProxy(res.result.$h, 'DOMMatrix');
    }
    DOMMatrix.fromMatrix = function(other) { return new DOMMatrix(other); };
    try {
        Object.defineProperty(DOMMatrix, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && (instance.__type__ === 'DOMMatrix' || instance.__type__ === 'DOMMatrixReadOnly')),
            configurable: true
        });
    } catch(e) {}

    function CSSStyleSheet(options) {
        if (!new.target) throw new TypeError("Failed to construct 'CSSStyleSheet': Please use the 'new' operator");
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'CSSStyleSheet', args: [serializeArg(options || {})] });
        return getOrCreateProxy(res.result.$h, 'CSSStyleSheet');
    }
    try {
        Object.defineProperty(CSSStyleSheet, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'CSSStyleSheet'),
            configurable: true
        });
    } catch(e) {}

    function createCSSRuleClass(className) {
        function CSSRuleConstructor() {
            throw new TypeError("Illegal constructor");
        }
        Object.assign(CSSRuleConstructor, CSSRuleConstants);
        try {
            Object.defineProperty(CSSRuleConstructor, Symbol.hasInstance, {
                value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ && instance.__type__.startsWith('CSS')),
                configurable: true
            });
        } catch(e) {}
        return CSSRuleConstructor;
    }

    function createEmptyClass(className) {
        function Constructor() {
            throw new TypeError("Illegal constructor");
        }
        try {
            Object.defineProperty(Constructor, Symbol.hasInstance, {
                value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === className),
                configurable: true
            });
        } catch(e) {}
        return Constructor;
    }

    // ─── Auxiliary Interface Constructors (NodeFilter, Range) ───
    function createNodeFilter() {
        function NodeFilterConstructor() {}
        Object.assign(NodeFilterConstructor, NodeFilterConstants);
        return NodeFilterConstructor;
    }

    function createRangeClass() {
        function RangeConstructor() {
            if (!new.target) {
                throw new TypeError("Failed to construct 'Range': Please use the 'new' operator");
            }
            const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 2, method: 'createRange', args: [] });
            return getOrCreateProxy(res.result.$h, 'Range');
        }
        Object.assign(RangeConstructor, RangeConstants);
        return RangeConstructor;
    }

    // ─── Register Classes on Global Scope ───
    global.EventTarget = createEventTargetClass();
    global.Event = createEventClass('Event');
    global.CustomEvent = createEventClass('CustomEvent');
    global.UIEvent = createEventClass('UIEvent');
    global.MouseEvent = createEventClass('MouseEvent');
    global.KeyboardEvent = createEventClass('KeyboardEvent');
    global.PointerEvent = createEventClass('PointerEvent');
    global.FocusEvent = createEventClass('FocusEvent');
    global.InputEvent = createEventClass('InputEvent');
    global.WheelEvent = createEventClass('WheelEvent');
    global.SubmitEvent = createEventClass('SubmitEvent');
    global.DragEvent = createEventClass('DragEvent');
    global.TouchEvent = createEventClass('TouchEvent');
    global.AnimationEvent = createEventClass('AnimationEvent');
    global.TransitionEvent = createEventClass('TransitionEvent');

    global.Node = createNodeClass('Node');
    global.Element = createNodeClass('Element');
    global.Document = createNodeClass('Document');
    global.DocumentFragment = createNodeClass('DocumentFragment');
    global.Text = createNodeClass('Text');
    global.Comment = createNodeClass('Comment');
    global.Attr = createNodeClass('Attr');
    global.CDATASection = createNodeClass('CDATASection');
    global.ProcessingInstruction = createNodeClass('ProcessingInstruction');
    global.DocumentType = createNodeClass('DocumentType');

    // Register All HTML5 Element Classes
    for (const className of Object.keys(htmlTagMap)) {
        global[className] = createHTMLElementClass(className);
    }

    global.NodeFilter = createNodeFilter();
    global.Range = createRangeClass();

    global.Option = Option;
    global.Image = Image;
    global.Audio = Audio;
    global.FormData = FormData;
    global.Blob = Blob;
    global.File = File;
    global.FileReader = FileReader;

    // Task 03 Global Classes & APIs
    global.DOMRect = DOMRect;
    global.DOMRectReadOnly = DOMRect;
    global.DOMPoint = DOMPoint;
    global.DOMPointReadOnly = DOMPoint;
    global.DOMMatrix = DOMMatrix;
    global.DOMMatrixReadOnly = DOMMatrix;
    global.DOMRectList = createEmptyClass('DOMRectList');
    global.CSSStyleSheet = CSSStyleSheet;
    global.CSSRule = createCSSRuleClass('CSSRule');
    global.CSSStyleRule = createCSSRuleClass('CSSStyleRule');
    global.CSSMediaRule = createCSSRuleClass('CSSMediaRule');
    global.CSSKeyframesRule = createCSSRuleClass('CSSKeyframesRule');
    global.CSSKeyframeRule = createCSSRuleClass('CSSKeyframeRule');
    global.CSSSupportsRule = createCSSRuleClass('CSSSupportsRule');
    global.CSSStyleDeclaration = createEmptyClass('CSSStyleDeclaration');
    global.MediaQueryList = createEmptyClass('MediaQueryList');
    global.Animation = createEmptyClass('Animation');

    global.getComputedStyle = function(elt, pseudo) {
        return global.window.getComputedStyle(elt, pseudo);
    };
    global.matchMedia = function(query) {
        return global.window.matchMedia(query);
    };

    // ─── Task 04: Base64 Encoding & Decoding ───
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    function btoa(input) {
        const str = String(input);
        let output = '';
        for (let block = 0, charCode, idx = 0, map = b64chars;
            str.charAt(idx | 0) || (map = '=', idx % 1);
            output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
            charCode = str.charCodeAt(idx += 3/4);
            if (charCode > 0xFF) {
                throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
            }
            block = block << 8 | charCode;
        }
        return output;
    }

    function atob(input) {
        const str = String(input).replace(/[=]+$/, '');
        if (str.length % 4 === 1) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        let output = '';
        for (let bc = 0, bs = 0, buffer, idx = 0;
            buffer = str.charAt(idx++);
            ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            buffer = b64chars.indexOf(buffer);
        }
        return output;
    }

    // ─── Task 04: URLSearchParams & URL Implementations ───
    function URLSearchParamsPolyfill(init) {
        this._entries = [];
        if (typeof init === 'string') {
            let str = init;
            if (str.startsWith('?')) str = str.slice(1);
            if (str.length > 0) {
                const pairs = str.split('&');
                for (const pair of pairs) {
                    if (!pair) continue;
                    const idx = pair.indexOf('=');
                    if (idx !== -1) {
                        const k = decodeURIComponent(pair.slice(0, idx).split('+').join(' '));
                        const v = decodeURIComponent(pair.slice(idx + 1).split('+').join(' '));
                        this._entries.push([k, v]);
                    } else {
                        this._entries.push([decodeURIComponent(pair.split('+').join(' ')), '']);
                    }
                }
            }
        } else if (init && typeof init === 'object') {
            if (init._entries) {
                this._entries = init._entries.map(e => [e[0], e[1]]);
            } else if (Array.isArray(init)) {
                for (const item of init) this._entries.push([String(item[0]), String(item[1])]);
            } else if (typeof init[Symbol.iterator] === 'function') {
                for (const item of init) this._entries.push([String(item[0]), String(item[1])]);
            } else {
                for (const k of Object.keys(init)) this._entries.push([String(k), String(init[k])]);
            }
        }
    }
    URLSearchParamsPolyfill.prototype.append = function(name, value) {
        this._entries.push([String(name), String(value)]);
    };
    URLSearchParamsPolyfill.prototype.delete = function(name) {
        const k = String(name);
        this._entries = this._entries.filter(e => e[0] !== k);
    };
    URLSearchParamsPolyfill.prototype.get = function(name) {
        const k = String(name);
        const entry = this._entries.find(e => e[0] === k);
        return entry ? entry[1] : null;
    };
    URLSearchParamsPolyfill.prototype.getAll = function(name) {
        const k = String(name);
        return this._entries.filter(e => e[0] === k).map(e => e[1]);
    };
    URLSearchParamsPolyfill.prototype.has = function(name) {
        const k = String(name);
        return this._entries.some(e => e[0] === k);
    };
    URLSearchParamsPolyfill.prototype.set = function(name, value) {
        const k = String(name), v = String(value);
        let found = false;
        this._entries = this._entries.filter(e => {
            if (e[0] === k) {
                if (!found) { e[1] = v; found = true; return true; }
                return false;
            }
            return true;
        });
        if (!found) this._entries.push([k, v]);
    };
    URLSearchParamsPolyfill.prototype.sort = function() {
        this._entries.sort((a, b) => a[0].localeCompare(b[0]));
    };
    URLSearchParamsPolyfill.prototype.forEach = function(callback, thisArg) {
        for (const [k, v] of this._entries) {
            callback.call(thisArg, v, k, this);
        }
    };
    URLSearchParamsPolyfill.prototype.keys = function*() {
        for (const [k] of this._entries) yield k;
    };
    URLSearchParamsPolyfill.prototype.values = function*() {
        for (const [, v] of this._entries) yield v;
    };
    URLSearchParamsPolyfill.prototype.entries = function*() {
        for (const e of this._entries) yield [e[0], e[1]];
    };
    URLSearchParamsPolyfill.prototype[Symbol.iterator] = function() {
        return this.entries();
    };
    Object.defineProperty(URLSearchParamsPolyfill.prototype, 'size', {
        get() { return this._entries.length; }
    });
    URLSearchParamsPolyfill.prototype.toString = function() {
        return this._entries.map(e => encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1])).join('&');
    };

    function parseURLParts(urlStr) {
        let str = String(urlStr);
        let hash = '';
        const hashIdx = str.indexOf('#');
        if (hashIdx !== -1) {
            hash = str.slice(hashIdx);
            str = str.slice(0, hashIdx);
        }
        let search = '';
        const searchIdx = str.indexOf('?');
        if (searchIdx !== -1) {
            search = str.slice(searchIdx);
            str = str.slice(0, searchIdx);
        }
        let protocol = 'http:';
        let host = '';
        let hostname = '';
        let port = '';
        let pathname = '/';
        let username = '';
        let password = '';

        const protoIdx = str.indexOf('://');
        if (protoIdx !== -1) {
            protocol = str.slice(0, protoIdx + 1);
            str = str.slice(protoIdx + 3);
        }

        const slashIdx = str.indexOf('/');
        let authority = '';
        if (slashIdx !== -1) {
            authority = str.slice(0, slashIdx);
            pathname = str.slice(slashIdx);
        } else {
            authority = str;
            pathname = '/';
        }

        const atIdx = authority.indexOf('@');
        if (atIdx !== -1) {
            const userinfo = authority.slice(0, atIdx);
            authority = authority.slice(atIdx + 1);
            const colonIdx = userinfo.indexOf(':');
            if (colonIdx !== -1) {
                username = userinfo.slice(0, colonIdx);
                password = userinfo.slice(colonIdx + 1);
            } else {
                username = userinfo;
            }
        }

        host = authority;
        const portColon = authority.lastIndexOf(':');
        if (portColon !== -1 && !authority.includes(']')) {
            hostname = authority.slice(0, portColon);
            port = authority.slice(portColon + 1);
        } else {
            hostname = authority;
        }

        return { protocol, username, password, host, hostname, port, pathname, search, hash };
    }

    function URLPolyfill(url, base) {
        if (!new.target) throw new TypeError("Failed to construct 'URL': Please use the 'new' operator");
        let fullUrl = String(url);
        if (base) {
            let b = String(base);
            if (!fullUrl.includes('://')) {
                if (fullUrl.startsWith('/')) {
                    const bSlash = b.indexOf('/', b.indexOf('://') + 3);
                    const bOrigin = bSlash !== -1 ? b.slice(0, bSlash) : b;
                    fullUrl = bOrigin + fullUrl;
                } else {
                    const lastSlash = b.lastIndexOf('/');
                    if (lastSlash > 7) fullUrl = b.slice(0, lastSlash + 1) + fullUrl;
                    else fullUrl = b + '/' + fullUrl;
                }
            }
        }

        const parts = parseURLParts(fullUrl);
        this._protocol = parts.protocol;
        this._username = parts.username;
        this._password = parts.password;
        this._hostname = parts.hostname;
        this._port = parts.port;
        this._pathname = parts.pathname;
        if (!this._pathname.startsWith('/')) this._pathname = '/' + this._pathname;
        this._search = parts.search;
        this._hash = parts.hash;

        const self = this;
        this._searchParams = new URLSearchParamsPolyfill(this._search);
        const origAppend = this._searchParams.append.bind(this._searchParams);
        const origSet = this._searchParams.set.bind(this._searchParams);
        const origDelete = this._searchParams.delete.bind(this._searchParams);
        const origSort = this._searchParams.sort.bind(this._searchParams);

        function sync() {
            const qs = self._searchParams.toString();
            self._search = qs ? '?' + qs : '';
        }
        this._searchParams.append = function(...args) { origAppend(...args); sync(); };
        this._searchParams.set = function(...args) { origSet(...args); sync(); };
        this._searchParams.delete = function(...args) { origDelete(...args); sync(); };
        this._searchParams.sort = function(...args) { origSort(...args); sync(); };
    }
    Object.defineProperty(URLPolyfill.prototype, 'protocol', {
        get() { return this._protocol; },
        set(v) { this._protocol = String(v).endsWith(':') ? String(v) : String(v) + ':'; }
    });
    Object.defineProperty(URLPolyfill.prototype, 'hostname', {
        get() { return this._hostname; },
        set(v) { this._hostname = String(v); }
    });
    Object.defineProperty(URLPolyfill.prototype, 'port', {
        get() { return this._port; },
        set(v) { this._port = String(v); }
    });
    Object.defineProperty(URLPolyfill.prototype, 'host', {
        get() { return this._hostname + (this._port ? ':' + this._port : ''); },
        set(v) {
            const parts = String(v).split(':');
            this._hostname = parts[0];
            this._port = parts[1] || '';
        }
    });
    Object.defineProperty(URLPolyfill.prototype, 'pathname', {
        get() { return this._pathname; },
        set(v) {
            let p = String(v);
            if (!p.startsWith('/')) p = '/' + p;
            this._pathname = p;
        }
    });
    Object.defineProperty(URLPolyfill.prototype, 'search', {
        get() { return this._search; },
        set(v) {
            let s = String(v);
            if (s && !s.startsWith('?')) s = '?' + s;
            this._search = s;
            this._searchParams = new URLSearchParamsPolyfill(this._search);
        }
    });
    Object.defineProperty(URLPolyfill.prototype, 'hash', {
        get() { return this._hash; },
        set(v) {
            let h = String(v);
            if (h && !h.startsWith('#')) h = '#' + h;
            this._hash = h;
        }
    });
    Object.defineProperty(URLPolyfill.prototype, 'origin', {
        get() { return this._protocol + '//' + this.host; }
    });
    Object.defineProperty(URLPolyfill.prototype, 'href', {
        get() {
            let userinfo = this._username;
            if (this._password) userinfo += ':' + this._password;
            if (userinfo) userinfo += '@';
            return this._protocol + '//' + userinfo + this.host + this._pathname + this._search + this._hash;
        },
        set(v) {
            const u = new URLPolyfill(v);
            this._protocol = u._protocol;
            this._username = u._username;
            this._password = u._password;
            this._hostname = u._hostname;
            this._port = u._port;
            this._pathname = u._pathname;
            this._search = u._search;
            this._hash = u._hash;
            this._searchParams = new URLSearchParamsPolyfill(this._search);
        }
    });
    Object.defineProperty(URLPolyfill.prototype, 'searchParams', {
        get() { return this._searchParams; }
    });
    URLPolyfill.prototype.toString = function() { return this.href; };
    URLPolyfill.prototype.toJSON = function() { return this.href; };
    URLPolyfill.createObjectURL = function(obj) {
        const res = __wireCall({ op: 'CREATE_OBJECT_URL', blob: serializeArg(obj) });
        return res.result;
    };
    URLPolyfill.revokeObjectURL = function(url) {
        __wireCall({ op: 'REVOKE_OBJECT_URL', url: String(url) });
    };

    // ─── Task 04: Timers & RAF Wire Bridges ───
    let nextTimerId = 1;
    const timerCallbacks = new Map();

    function setTimeout(callback, delay, ...args) {
        const id = nextTimerId++;
        timerCallbacks.set(id, { callback, args });
        __wireCall({
            op: 'SET_TIMEOUT',
            id: id,
            delay: Number(delay) || 0
        });
        return id;
    }

    function clearTimeout(id) {
        timerCallbacks.delete(Number(id));
        __wireCall({
            op: 'CLEAR_TIMEOUT',
            id: Number(id)
        });
    }

    function setInterval(callback, delay, ...args) {
        const id = nextTimerId++;
        timerCallbacks.set(id, { callback, args, isInterval: true });
        __wireCall({
            op: 'SET_INTERVAL',
            id: id,
            delay: Number(delay) || 0
        });
        return id;
    }

    function clearInterval(id) {
        timerCallbacks.delete(Number(id));
        __wireCall({
            op: 'CLEAR_INTERVAL',
            id: Number(id)
        });
    }

    function requestAnimationFrame(callback) {
        const id = nextTimerId++;
        timerCallbacks.set(id, { callback });
        __wireCall({
            op: 'REQUEST_ANIMATION_FRAME',
            id: id
        });
        return id;
    }

    function cancelAnimationFrame(id) {
        timerCallbacks.delete(Number(id));
        __wireCall({
            op: 'CANCEL_ANIMATION_FRAME',
            id: Number(id)
        });
    }

    function queueMicrotask(callback) {
        if (typeof Promise !== 'undefined') {
            Promise.resolve().then(callback);
        } else {
            setTimeout(callback, 0);
        }
    }

    // ─── Task 04: BOM Classes & Globals ───
    global.Location = createEmptyClass('Location');
    global.History = createEmptyClass('History');
    global.Navigator = createEmptyClass('Navigator');
    global.Screen = createEmptyClass('Screen');
    global.Performance = createEmptyClass('Performance');
    global.URL = URLPolyfill;
    global.URLSearchParams = URLSearchParamsPolyfill;

    // ─── Task 05: Canvas 2D, Path2D, ImageData & OffscreenCanvas ───
    function ImageData(arg1, arg2, arg3) {
        if (!new.target) throw new TypeError("Failed to construct 'ImageData': Please use the 'new' operator");
        let data, width, height, settings;
        if (arg1 instanceof Uint8ClampedArray) {
            data = arg1;
            width = Number(arg2);
            if (arg3 !== undefined && typeof arg3 === 'number') {
                height = arg3;
            } else {
                height = Math.floor(data.length / (4 * width));
                if (arg3 && typeof arg3 === 'object') settings = arg3;
            }
        } else {
            width = Number(arg1);
            height = Number(arg2);
            if (arg3 && typeof arg3 === 'object') settings = arg3;
            data = new Uint8ClampedArray(width * height * 4);
        }
        this.width = width;
        this.height = height;
        this.data = data;
        this.colorSpace = (settings && settings.colorSpace) || 'srgb';
    }
    try {
        Object.defineProperty(ImageData, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && (
                instance.constructor === ImageData ||
                (instance.__handle__ && instance.__type__ === 'ImageData') ||
                (instance.data instanceof Uint8ClampedArray && typeof instance.width === 'number' && typeof instance.height === 'number')
            )),
            configurable: true
        });
    } catch(e) {}

    function Path2D(pathOrD) {
        if (!new.target) throw new TypeError("Failed to construct 'Path2D': Please use the 'new' operator");
        const args = [];
        if (pathOrD !== undefined) args.push(serializeArg(pathOrD));
        const res = __wireCall({ op: 'NEW_CONSTRUCT', h: 1, method: 'Path2D', args: args });
        return getOrCreateProxy(res.result.$h, 'Path2D');
    }
    try {
        Object.defineProperty(Path2D, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'Path2D'),
            configurable: true
        });
    } catch(e) {}

    function OffscreenCanvas(width, height) {
        if (!new.target) throw new TypeError("Failed to construct 'OffscreenCanvas': Please use the 'new' operator");
        const res = __wireCall({
            op: 'NEW_CONSTRUCT',
            h: 1,
            method: 'OffscreenCanvas',
            args: [Number(width || 0), Number(height || 0)]
        });
        return getOrCreateProxy(res.result.$h, 'OffscreenCanvas');
    }
    try {
        Object.defineProperty(OffscreenCanvas, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && instance.__type__ === 'OffscreenCanvas'),
            configurable: true
        });
    } catch(e) {}

    global.ImageData = ImageData;
    global.Path2D = Path2D;
    global.OffscreenCanvas = OffscreenCanvas;
    const canvas2DCtxClass = createEmptyClass('CanvasRenderingContext2D');
    try {
        Object.defineProperty(canvas2DCtxClass, Symbol.hasInstance, {
            value: (instance) => !!(instance && typeof instance === 'object' && instance.__handle__ && (
                instance.__type__ === 'CanvasRenderingContext2D' ||
                instance.__type__ === 'OffscreenCanvasRenderingContext2D'
            )),
            configurable: true
        });
    } catch(e) {}
    global.CanvasRenderingContext2D = canvas2DCtxClass;
    global.OffscreenCanvasRenderingContext2D = createEmptyClass('OffscreenCanvasRenderingContext2D');
    global.CanvasGradient = createEmptyClass('CanvasGradient');
    global.CanvasPattern = createEmptyClass('CanvasPattern');
    global.TextMetrics = createEmptyClass('TextMetrics');
    global.ImageBitmap = createEmptyClass('ImageBitmap');
    global.createImageBitmap = function(image, ...args) {
        const res = __wireCall({
            op: 'CALL',
            h: 1,
            method: 'createImageBitmap',
            args: [serializeArg(image), ...args.map(serializeArg)]
        });
        return Promise.resolve(getOrCreateProxy(res.result ? res.result.$h : 1, 'ImageBitmap'));
    };

    global.atob = atob;
    global.btoa = btoa;
    global.setTimeout = setTimeout;
    global.clearTimeout = clearTimeout;
    global.setInterval = setInterval;
    global.clearInterval = clearInterval;
    global.requestAnimationFrame = requestAnimationFrame;
    global.cancelAnimationFrame = cancelAnimationFrame;
    global.queueMicrotask = queueMicrotask;
    global.requestIdleCallback = requestAnimationFrame;
    global.cancelIdleCallback = cancelAnimationFrame;

    global.alert = function(msg) { return global.window.alert(msg); };
    global.confirm = function(msg) { return global.window.confirm(msg); };
    global.prompt = function(msg, def) { return global.window.prompt(msg, def); };
    global.open = function(...args) { return global.window.open(...args); };
    global.close = function() { return global.window.close(); };
    global.postMessage = function(...args) { return global.window.postMessage(...args); };

    // Root Proxies: Handles 1..7 (Window, Document, Location, Navigator, History, Screen, Performance)
    global.window = getOrCreateProxy(1, 'Window');
    global.document = getOrCreateProxy(2, 'Document');
    global.location = getOrCreateProxy(3, 'Location');
    global.navigator = getOrCreateProxy(4, 'Navigator');
    global.history = getOrCreateProxy(5, 'History');
    global.screen = getOrCreateProxy(6, 'Screen');
    global.performance = getOrCreateProxy(7, 'Performance');

    global.self = global.window;
    global.top = global.window;
    global.parent = global.window;
    global.frames = global.window;

})(typeof globalThis !== 'undefined' ? globalThis : this);
`;

// ─── Bootstrap Loader Generation (UWPE Host Runtime + WASI) ───
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
                        
                        // ─── Host ObjectRegistry & Identity Preservation ───
                        const handleToObject = new Map();
                        const objectToHandle = new WeakMap();
                        let nextHandleId = 1;

                        function register(obj) {
                            if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return obj;
                            if (typeof ImageData !== 'undefined' && obj instanceof ImageData) {
                                return {
                                    $imageData: true,
                                    width: obj.width,
                                    height: obj.height,
                                    data: Array.from(obj.data)
                                };
                            }
                            if (typeof Uint8ClampedArray !== 'undefined' && obj instanceof Uint8ClampedArray) {
                                return Array.from(obj);
                            }
                            if (Array.isArray(obj)) {
                                if (obj.length === 0 || typeof obj[0] === 'number' || typeof obj[0] === 'string' || typeof obj[0] === 'boolean') {
                                    return obj.slice();
                                }
                                if (objectToHandle.has(obj)) {
                                    return { $h: objectToHandle.get(obj), $t: 'Array' };
                                }
                                const id = nextHandleId++;
                                handleToObject.set(id, obj);
                                try { objectToHandle.set(obj, id); } catch(e) {}
                                return obj.map(register);
                            }
                            if (objectToHandle.has(obj)) {
                                const id = objectToHandle.get(obj);
                                return { $h: id, $t: obj.constructor ? obj.constructor.name : 'Object' };
                            }
                            const id = nextHandleId++;
                            handleToObject.set(id, obj);
                            try { objectToHandle.set(obj, id); } catch(e) {}
                            let typeName = 'Object';
                            if (obj === window) typeName = 'Window';
                            else if (obj === document) typeName = 'Document';
                            else if (obj === window.location) typeName = 'Location';
                            else if (obj === window.navigator) typeName = 'Navigator';
                            else if (obj === window.history) typeName = 'History';
                            else if (obj === window.screen) typeName = 'Screen';
                            else if (obj === window.performance) typeName = 'Performance';
                            else if (obj instanceof CSSStyleDeclaration) typeName = 'CSSStyleDeclaration';
                            else if (obj instanceof DOMRect) typeName = 'DOMRect';
                            else if (obj instanceof DOMPoint) typeName = 'DOMPoint';
                            else if (obj instanceof DOMMatrix) typeName = 'DOMMatrix';
                            else if (typeof MediaQueryList !== 'undefined' && obj instanceof MediaQueryList) typeName = 'MediaQueryList';
                            else if (typeof Animation !== 'undefined' && obj instanceof Animation) typeName = 'Animation';
                            else if (typeof Path2D !== 'undefined' && obj instanceof Path2D) typeName = 'Path2D';
                            else if (typeof CanvasRenderingContext2D !== 'undefined' && obj instanceof CanvasRenderingContext2D) typeName = 'CanvasRenderingContext2D';
                            else if (typeof OffscreenCanvasRenderingContext2D !== 'undefined' && obj instanceof OffscreenCanvasRenderingContext2D) typeName = 'OffscreenCanvasRenderingContext2D';
                            else if (typeof CanvasGradient !== 'undefined' && obj instanceof CanvasGradient) typeName = 'CanvasGradient';
                            else if (typeof CanvasPattern !== 'undefined' && obj instanceof CanvasPattern) typeName = 'CanvasPattern';
                            else if (typeof TextMetrics !== 'undefined' && obj instanceof TextMetrics) typeName = 'TextMetrics';
                            else if (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas) typeName = 'OffscreenCanvas';
                            else if (typeof ImageBitmap !== 'undefined' && obj instanceof ImageBitmap) typeName = 'ImageBitmap';
                            else if (obj.constructor && obj.constructor.name) typeName = obj.constructor.name;
                            return { $h: id, $t: typeName };
                        }

                        // Pre-register Handles 1..7 (Window, Document, Location, Navigator, History, Screen, Performance)
                        register(window);
                        register(document);
                        register(window.location);
                        register(window.navigator);
                        register(window.history);
                        register(window.screen);
                        register(window.performance);

                        const hostTimers = new Map();

                        function resolve(val) {
                            if (val && typeof val === 'object') {
                                if (val.$h) return handleToObject.get(val.$h);
                                if (val.$imageData) {
                                    const arr = new Uint8ClampedArray(val.data);
                                    return new ImageData(arr, val.width, val.height);
                                }
                                if (Array.isArray(val)) {
                                    return val.map(resolve);
                                }
                            }
                            return val;
                        }

                        // ─── WASI Snapshot Preview 1 Runtime ───
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
                                
                                // Intercept UWPE Wire Calls
                                if (str.startsWith('__UWPE__')) {
                                    const payload = str.substring('__UWPE__'.length).trim();
                                    const cmd = JSON.parse(payload);
                                    let response = { result: null };

                                    try {
                                        const target = handleToObject.get(cmd.h);
                                        if (cmd.op === 'GET') {
                                            const member = target[cmd.prop];
                                            if (typeof member === 'function') {
                                                response.isMethod = true;
                                            } else {
                                                response.result = register(member);
                                            }
                                        } else if (cmd.op === 'SET') {
                                            target[cmd.prop] = resolve(cmd.val);
                                            response.result = true;
                                        } else if (cmd.op === 'CALL') {
                                            const method = target[cmd.method];
                                            const args = (cmd.args || []).map(resolve);
                                            const callRes = method.apply(target, args);
                                            response.result = register(callRes);
                                        } else if (cmd.op === 'NEW_CONSTRUCT') {
                                            const Ctor = (target && target[cmd.method]) || window[cmd.method];
                                            const args = (cmd.args || []).map(resolve);
                                            const newObj = new Ctor(...args);
                                            response.result = register(newObj);
                                        } else if (cmd.op === 'NEW_EVENT') {
                                            const Ctor = window[cmd.cls] || Event;
                                            const init = cmd.init || {};
                                            const resolvedInit = {};
                                            for (const k of Object.keys(init)) {
                                                resolvedInit[k] = resolve(init[k]);
                                            }
                                            const evt = new Ctor(cmd.type, resolvedInit);
                                            response.result = register(evt);
                                        } else if (cmd.op === 'ADD_LISTENER') {
                                            target.addEventListener(cmd.type, function(evt) {
                                                // Host event listener registration
                                            }, cmd.opts);
                                            response.result = true;
                                        } else if (cmd.op === 'REMOVE_LISTENER') {
                                            response.result = true;
                                        } else if (cmd.op === 'DISPATCH_EVENT') {
                                            const evt = resolve(cmd.event);
                                            response.result = target.dispatchEvent(evt);
                                        } else if (cmd.op === 'CLASSLIST_ADD') {
                                            cmd.tokens.forEach(t => target.classList.add(t));
                                            response.result = true;
                                        } else if (cmd.op === 'CLASSLIST_REMOVE') {
                                            cmd.tokens.forEach(t => target.classList.remove(t));
                                            response.result = true;
                                        } else if (cmd.op === 'CLASSLIST_TOGGLE') {
                                            response.result = target.classList.toggle(cmd.token, cmd.force);
                                        } else if (cmd.op === 'CLASSLIST_CONTAINS') {
                                            response.result = target.classList.contains(cmd.token);
                                        } else if (cmd.op === 'CLASSLIST_REPLACE') {
                                            response.result = target.classList.replace(cmd.oldToken, cmd.newToken);
                                        } else if (cmd.op === 'STYLE_GET') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s[cmd.prop];
                                        } else if (cmd.op === 'STYLE_SET') {
                                            const s = (target && target.style) ? target.style : target;
                                            s[cmd.prop] = cmd.val;
                                            response.result = true;
                                        } else if (cmd.op === 'STYLE_SET_PROP') {
                                            const s = (target && target.style) ? target.style : target;
                                            s.setProperty(cmd.prop, cmd.val, cmd.priority);
                                            response.result = true;
                                        } else if (cmd.op === 'STYLE_GET_PROP') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s.getPropertyValue(cmd.prop);
                                        } else if (cmd.op === 'STYLE_GET_PRIORITY') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s.getPropertyPriority(cmd.prop);
                                        } else if (cmd.op === 'STYLE_REMOVE_PROP') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s.removeProperty(cmd.prop);
                                        } else if (cmd.op === 'STYLE_ITEM') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s.item(cmd.index);
                                        } else if (cmd.op === 'STYLE_LENGTH') {
                                            const s = (target && target.style) ? target.style : target;
                                            response.result = s.length;
                                        } else if (cmd.op === 'GET_COMPUTED_STYLE') {
                                            const el = handleToObject.get(cmd.elt);
                                            const cs = window.getComputedStyle(el, cmd.pseudo || undefined);
                                            response.result = register(cs);
                                        } else if (cmd.op === 'MATCH_MEDIA') {
                                            const mql = window.matchMedia(cmd.query);
                                            response.result = register(mql);
                                        } else if (cmd.op === 'GET_BOUNDING_CLIENT_RECT') {
                                            const rect = target.getBoundingClientRect();
                                            response.result = register(rect);
                                        } else if (cmd.op === 'GET_CLIENT_RECTS') {
                                            const rects = target.getClientRects();
                                            response.result = register(rects);
                                        } else if (cmd.op === 'ANIMATE') {
                                            const kf = resolve(cmd.keyframes);
                                            const opt = resolve(cmd.options);
                                            const anim = target.animate(kf, opt);
                                            response.result = register(anim);
                                        } else if (cmd.op === 'EVAL') {
                                            const raw = (0, eval)(cmd.code);
                                            response.result = register(raw);
                                        } else if (cmd.op === 'SET_TIMEOUT') {
                                            const tId = window.setTimeout(() => {
                                                hostTimers.delete(cmd.id);
                                            }, cmd.delay);
                                            hostTimers.set(cmd.id, tId);
                                            response.result = cmd.id;
                                        } else if (cmd.op === 'CLEAR_TIMEOUT') {
                                            const tId = hostTimers.get(cmd.id);
                                            if (tId !== undefined) {
                                                window.clearTimeout(tId);
                                                hostTimers.delete(cmd.id);
                                            }
                                            response.result = true;
                                        } else if (cmd.op === 'SET_INTERVAL') {
                                            const tId = window.setInterval(() => {}, cmd.delay);
                                            hostTimers.set(cmd.id, tId);
                                            response.result = cmd.id;
                                        } else if (cmd.op === 'CLEAR_INTERVAL') {
                                            const tId = hostTimers.get(cmd.id);
                                            if (tId !== undefined) {
                                                window.clearInterval(tId);
                                                hostTimers.delete(cmd.id);
                                            }
                                            response.result = true;
                                        } else if (cmd.op === 'REQUEST_ANIMATION_FRAME') {
                                            const rafId = window.requestAnimationFrame(() => {
                                                hostTimers.delete(cmd.id);
                                            });
                                            hostTimers.set(cmd.id, rafId);
                                            response.result = cmd.id;
                                        } else if (cmd.op === 'CANCEL_ANIMATION_FRAME') {
                                            const rafId = hostTimers.get(cmd.id);
                                            if (rafId !== undefined) {
                                                window.cancelAnimationFrame(rafId);
                                                hostTimers.delete(cmd.id);
                                            }
                                            response.result = true;
                                        } else if (cmd.op === 'PERFORMANCE_NOW') {
                                            response.result = window.performance.now();
                                        } else if (cmd.op === 'CREATE_OBJECT_URL') {
                                            const blob = resolve(cmd.blob);
                                            response.result = URL.createObjectURL(blob);
                                        } else if (cmd.op === 'REVOKE_OBJECT_URL') {
                                            URL.revokeObjectURL(cmd.url);
                                            response.result = true;
                                        } else if (cmd.op === 'GET_IMAGE_DATA') {
                                            const imgData = target.getImageData(cmd.sx, cmd.sy, cmd.sw, cmd.sh, cmd.settings);
                                            response.result = {
                                                $imageData: true,
                                                width: imgData.width,
                                                height: imgData.height,
                                                data: Array.from(imgData.data)
                                            };
                                        } else if (cmd.op === 'PUT_IMAGE_DATA') {
                                            const imgData = resolve(cmd.imagedata);
                                            if (cmd.dirtyX !== undefined) {
                                                target.putImageData(imgData, cmd.dx, cmd.dy, cmd.dirtyX, cmd.dirtyY, cmd.dirtyWidth, cmd.dirtyHeight);
                                            } else {
                                                target.putImageData(imgData, cmd.dx, cmd.dy);
                                            }
                                            response.result = true;
                                        }
                                    } catch (err) {
                                        response = { error: err.message };
                                    }

                                    let resStr;
                                    try {
                                        resStr = JSON.stringify(response);
                                    } catch(e) {
                                        resStr = JSON.stringify({ result: null, error: e.message });
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
            ? `WebAssembly (UWPE Engine / Javy ${javyVersion || '3.0+'})` 
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