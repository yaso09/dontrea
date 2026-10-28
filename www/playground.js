(() => {
  const $ = (selector) => document.querySelector(selector);
  const fileInput = $('#html-file');
  const dropZone = $('#drop-zone');
  const buildButton = $('#build-button');
  const message = $('#build-message');
  const t = (key, ...args) => window.DontreaI18n?.t(key, ...args) || key;
  let wasmGzipBase64 = window.DONTREA_PLAYGROUND_WASM_GZIP_BASE64;
  let wasmBundlePromise = null;
  let selectedFile = null;
  let wasmPromise = null;
  let downloadUrl = null;

  function setStatus(text, state = 'ready') {
    $('#engine-status').textContent = text;
    $('#engine-dot').className = `status-dot${state === 'ready' ? ' is-ready' : state === 'error' ? ' is-error' : ''}`;
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function getWasm() {
    if (!wasmPromise) {
      const loadBundle = wasmGzipBase64 ? Promise.resolve() : (wasmBundlePromise ||= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'dontrea-playground-wasm.js';
        script.onload = () => {
          wasmGzipBase64 = window.DONTREA_PLAYGROUND_WASM_GZIP_BASE64;
          if (wasmGzipBase64) resolve();
          else reject(new Error(t('wasmMissing')));
        };
        script.onerror = () => reject(new Error(t('wasmUnavailable')));
        document.head.append(script);
      }));
      wasmPromise = loadBundle.then(async () => {
        if (typeof DecompressionStream === 'undefined') throw new Error(t('gzipUnavailable'));
        const compressed = base64ToBytes(wasmGzipBase64);
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
        const wasmBytes = await new Response(stream).arrayBuffer();
        return WebAssembly.compile(wasmBytes);
      });
    }
    return wasmPromise;
  }

  async function transform(code, options) {
    const module = await getWasm();
    const input = new TextEncoder().encode(JSON.stringify({ code, options }));
    const outputParts = [];
    let memory;
    let inputOffset = 0;
    let exitCode = 0;
    const wasi = {
      fd_write(fd, iovs, count, written) {
        const view = new DataView(memory.buffer);
        let total = 0;
        for (let index = 0; index < count; index += 1) {
          const pointer = view.getUint32(iovs + index * 8, true);
          const length = view.getUint32(iovs + index * 8 + 4, true);
          const slice = new Uint8Array(memory.buffer, pointer, length);
          if (fd === 1 || fd === 2) outputParts.push(slice.slice());
          total += length;
        }
        view.setUint32(written, total, true);
        return 0;
      },
      fd_read(fd, iovs, count, read) {
        const view = new DataView(memory.buffer);
        let total = 0;
        for (let index = 0; index < count && inputOffset < input.length; index += 1) {
          const pointer = view.getUint32(iovs + index * 8, true);
          const length = view.getUint32(iovs + index * 8 + 4, true);
          const amount = Math.min(length, input.length - inputOffset);
          new Uint8Array(memory.buffer, pointer, amount).set(input.subarray(inputOffset, inputOffset + amount));
          inputOffset += amount;
          total += amount;
        }
        view.setUint32(read, total, true);
        return 0;
      },
      random_get(pointer, length) {
        crypto.getRandomValues(new Uint8Array(memory.buffer, pointer, length));
        return 0;
      },
      clock_time_get(_id, _precision, pointer) {
        new DataView(memory.buffer).setBigUint64(pointer, BigInt(Date.now()) * 1000000n, true);
        return 0;
      },
      environ_get: () => 0,
      environ_sizes_get(_count, size) { new DataView(memory.buffer).setUint32(size, 0, true); return 0; },
      args_get: () => 0,
      args_sizes_get(count, size) { const view = new DataView(memory.buffer); view.setUint32(count, 0, true); view.setUint32(size, 0, true); return 0; },
      fd_close: () => 0,
      fd_fdstat_get: () => 0,
      fd_seek: () => 0,
      proc_exit(code) { exitCode = code; }
    };
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi });
    memory = instance.exports.memory;
    try {
      if (instance.exports._start) instance.exports._start();
      else if (instance.exports.__main_void) instance.exports.__main_void();
    } catch (error) {
      if (!(error instanceof WebAssembly.RuntimeError) || exitCode === 0) throw error;
    }
    const bytes = outputParts.reduce((size, part) => size + part.length, 0);
    const output = new Uint8Array(bytes);
    let cursor = 0;
    for (const part of outputParts) { output.set(part, cursor); cursor += part.length; }
    const result = JSON.parse(new TextDecoder().decode(output));
    if (!result.ok) throw new Error(result.error || t('transformFailed'));
    return result.code;
  }

  function updateFile(file) {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      message.textContent = t('invalidFile');
      return;
    }
    selectedFile = file;
    $('#file-name').textContent = file.name;
    message.textContent = t('copyFileSize', (file.size / 1024).toFixed(1));
    buildButton.disabled = false;
    $('#result-panel').hidden = true;
    setStatus(t('statusLoading'));
    getWasm().then(() => setStatus(t('statusReady'))).catch((error) => {
      setStatus(t('statusError'), 'error');
      message.textContent = error.message;
    });
  }

  window.addEventListener('dontrea:languagechange', () => {
    if (selectedFile) {
      $('#file-name').textContent = selectedFile.name;
      message.textContent = $('#result-panel').hidden
        ? t('copyFileSize', (selectedFile.size / 1024).toFixed(1))
        : t('completed', Number($('#script-count').textContent) || 0);
      setStatus(t('statusReady'));
    }
  });

  function createProtectedHtml(source, protectedCode, partsCount) {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const inlineScripts = [...doc.querySelectorAll('script:not([src])')].filter((script) => script.textContent.trim());
    inlineScripts.forEach((script) => script.remove());
    if (!doc.head.querySelector('meta[charset]')) {
      const charset = doc.createElement('meta');
      charset.setAttribute('charset', 'utf-8');
      doc.head.prepend(charset);
    }

    const payload = btoa(Array.from(new TextEncoder().encode(protectedCode), (byte) => String.fromCharCode(byte)).join(''));
    const count = Math.max(1, Math.min(20, Number(partsCount) || 5));
    const size = Math.ceil(payload.length / count);
    const selectors = [];
    const tags = ['div', 'span', 'section', 'article', 'aside'];
    for (let offset = 0; offset < payload.length; offset += size) {
      const randomId = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(16).slice(2, 10));
      const id = `dontrea-${randomId()}`;
      const attr = `data-fragment-${randomId()}`;
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const fragment = doc.createElement(tag);
      fragment.id = id;
      fragment.setAttribute(attr, payload.slice(offset, offset + size));
      fragment.setAttribute('aria-hidden', 'true');
      fragment.className = 'dontrea-hidden';
      (doc.body || doc.documentElement).append(fragment);
      selectors.push({ id, attr });
    }

    const loader = doc.createElement('script');
    loader.textContent = `(function(){document.addEventListener('DOMContentLoaded',function(){try{var p=${JSON.stringify(selectors)}.map(function(x){var e=document.getElementById(x.id);return e?e.getAttribute(x.attr):''}).join('');var b=Uint8Array.from(atob(p),function(c){return c.charCodeAt(0)});var s=new TextDecoder('utf-8',{fatal:true}).decode(b);(0,eval)(s)}catch(e){console.error('Dontrea protected runtime:',e)}})})();`;
    (doc.body || doc.documentElement).append(loader);
    const style = doc.createElement('style');
    style.textContent = '.dontrea-hidden{display:none!important;visibility:hidden!important;position:absolute!important;z-index:-9999!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important}';
    doc.head.append(style);
    return { html: `<!doctype html>\n${doc.documentElement.outerHTML}`, scriptCount: inlineScripts.length };
  }

  fileInput.addEventListener('change', () => updateFile(fileInput.files[0]));
  for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
  for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); });
  dropZone.addEventListener('drop', (event) => updateFile(event.dataTransfer.files[0]));

  buildButton.addEventListener('click', async () => {
    if (!selectedFile) return;
    buildButton.disabled = true;
    buildButton.innerHTML = `${t('statusLoading')} <span>…</span>`;
    message.textContent = t('loadingMessage');
    try {
      const original = await selectedFile.text();
      const doc = new DOMParser().parseFromString(original, 'text/html');
      const scripts = [...doc.querySelectorAll('script:not([src])')].filter((script) => script.textContent.trim());
      if (!scripts.length) throw new Error(t('noScripts'));
      const code = scripts.map((script) => script.textContent).join('\n');
      const domains = $('#domain-lock').value.split(',').map((part) => part.trim()).filter(Boolean);
      const obfuscated = await transform(code, {
        controlFlowFlattening: $('#control-flow').checked,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: $('#dead-code').checked,
        debugProtection: $('#debug-protection').checked,
        debugProtectionInterval: 2000,
        selfDefending: $('#self-defending').checked,
        domainLock: domains
      });
      const result = createProtectedHtml(original, obfuscated, $('#parts').value);
      const outputBlob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(outputBlob);
      $('#download-link').href = downloadUrl;
      $('#download-link').download = `${selectedFile.name.replace(/\.html?$/i, '') || 'dontrea'}-protected.html`;
      $('#script-count').textContent = result.scriptCount;
      const before = new Blob([original]).size;
      const after = outputBlob.size;
      $('#size-reduction').textContent = `${before ? Math.round((1 - after / before) * 100) : 0}%`;
      $('#output-preview').textContent = result.html;
      $('#result-panel').hidden = false;
      message.textContent = t('completed', result.scriptCount);
      setStatus(t('statusReady'));
      $('#result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      message.textContent = error.message || t('buildError');
      setStatus(t('statusBuildError'), 'error');
    } finally {
      buildButton.disabled = !selectedFile;
      buildButton.innerHTML = t('build');
    }
  });
})();
