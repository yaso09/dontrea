# 📋 Task 10: Web Workers, Streams, Web Cryptography, Observers & System Device APIs

## 1. Scope & Objective
Virtualize multithreading and background computing (`Web Workers`, `MessageChannel`), byte streaming (`ReadableStream`, `WritableStream`), enterprise cryptography (`crypto.subtle`, `getRandomValues`), structural DOM/layout observers (`MutationObserver`, `IntersectionObserver`, `ResizeObserver`), and device sensory APIs (Clipboard, Notifications, Geolocation, Screen Wake Lock, Web Share).

---

## 2. API Surface & Interface Inventory

### 2.1 Web Workers & Multithreading

#### `Worker` (Dedicated Background Threads)
Constructor: `new Worker(scriptURL: string | URL, options?: WorkerOptions)`
- **Properties:**
  - `onmessage: ((this: Worker, ev: MessageEvent) => any) | null`
  - `onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null`
  - `onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null`
- **Methods:**
  - `postMessage(message: any, transfer: Transferable[]): void`
  - `postMessage(message: any, options?: StructuredSerializeOptions): void`
  - `terminate(): void`

#### `SharedWorker` & `MessageChannel`
- **`SharedWorker`:** Constructor `new SharedWorker(scriptURL, options?)`. Property: `port: MessagePort`.
- **`MessageChannel`:**
  - Constructor: `new MessageChannel()`
  - Properties: `port1: MessagePort`, `port2: MessagePort`
- **`MessagePort`:**
  - Inherits from `EventTarget`.
  - `postMessage(message: any, transfer?: Transferable[]): void`
  - `start(): void`, `close(): void`
  - `onmessage`, `onmessageerror`

---

### 2.2 Streams API (Streaming Data Processing)

#### `ReadableStream`
Constructor: `new ReadableStream<R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>)`
- **Properties:** `locked: boolean`
- **Methods:**
  - `cancel(reason?: any): Promise<void>`
  - `getReader(options?: { mode?: undefined }): ReadableStreamDefaultReader<R>`
  - `getReader(options: { mode: "byob" }): ReadableStreamBYOBReader`
  - `pipeThrough<T>(transform: ReadableWritablePair<T, R>, options?: StreamPipeOptions): ReadableStream<T>`
  - `pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>`
  - `tee(): [ReadableStream<R>, ReadableStream<R>]`

#### `WritableStream`
Constructor: `new WritableStream<W = any>(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>)`
- `locked: boolean`, `abort(reason?: any): Promise<void>`, `close(): Promise<void>`, `getWriter(): WritableStreamDefaultWriter<W>`.

#### `TransformStream`
Constructor: `new TransformStream<I = any, O = any>(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>)`
- `readable: ReadableStream<O>`, `writable: WritableStream<I>`.

---

### 2.3 Web Cryptography API (`crypto` & `crypto.subtle`)
Accessible via `window.crypto`.

#### `Crypto`
- **`getRandomValues<T extends ArrayBufferView | null>(array: T): T`**
  - Fills the buffer directly in Wasm linear memory with cryptographically secure random bytes via native OS entropy.
- **`randomUUID(): string`**
  - Generates RFC 4122 v4 UUID string.
- **`subtle: SubtleCrypto`**

#### `SubtleCrypto`
Hardware-accelerated cryptography operations returning Promises:
- **Hashing:**
  - `digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer>` (SHA-256, SHA-384, SHA-512, SHA-1)
- **Key Generation & Derivation:**
  - `generateKey(algorithm: RsaHashedKeyGenParams | EcKeyGenParams | HmacKeyGenParams | AesKeyGenParams, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKeyPair | CryptoKey>`
  - `deriveKey(algorithm: AlgorithmIdentifier, baseKey: CryptoKey, derivedKeyType: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>`
  - `deriveBits(algorithm: AlgorithmIdentifier, baseKey: CryptoKey, length: number): Promise<ArrayBuffer>`
- **Encryption & Decryption:**
  - `encrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>` (AES-GCM, AES-CBC, AES-CTR, RSA-OAEP)
  - `decrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>`
- **Signatures & Verification:**
  - `sign(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>` (HMAC, ECDSA, RSASSA-PKCS1-v1_5, RSA-PSS)
  - `verify(algorithm: AlgorithmIdentifier, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>`
- **Key Import & Export:**
  - `importKey(format: KeyFormat, keyData: BufferSource | JsonWebKey, algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>`
  - `exportKey(format: KeyFormat, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>`
  - `wrapKey()`, `unwrapKey()`

---

### 2.4 Modern Reactive Observers

#### 1. `IntersectionObserver` (Scroll & Visibility Detection)
Constructor: `new IntersectionObserver(callback: IntersectionObserverCallback, options?: IntersectionObserverInit)`
- `root: Element | Document | null`, `rootMargin: string`, `thresholds: readonly number[]`
- `observe(target: Element): void`, `unobserve(target: Element): void`, `disconnect(): void`, `takeRecords(): IntersectionObserverEntry[]`

#### 2. `ResizeObserver` (Element Bounds Tracking)
Constructor: `new ResizeObserver(callback: ResizeObserverCallback)`
- `observe(target: Element, options?: ResizeObserverOptions): void`, `unobserve(target: Element): void`, `disconnect(): void`

#### 3. `MutationObserver` (DOM Tree Alterations)
Constructor: `new MutationObserver(callback: MutationCallback)`
- `observe(target: Node, options?: MutationObserverInit): void` (attributes, childList, subtree, characterData, etc.)
- `disconnect(): void`, `takeRecords(): MutationRecord[]`

#### 4. `PerformanceObserver` (Telemetry & Vitals)
Constructor: `new PerformanceObserver(callback: PerformanceObserverCallback)`
- `observe(options?: PerformanceObserverInit): void`, `disconnect(): void`, `takeRecords(): PerformanceEntryList`

---

### 2.5 System Device & Sensory APIs

#### Geolocation (`navigator.geolocation`)
- `getCurrentPosition(successCallback: PositionCallback, errorCallback?: PositionErrorCallback, options?: PositionOptions): void`
- `watchPosition(successCallback: PositionCallback, errorCallback?: PositionErrorCallback, options?: PositionOptions): number`
- `clearWatch(watchId: number): void`

#### Async Clipboard API (`navigator.clipboard`)
- `read(): Promise<ClipboardItems>`
- `readText(): Promise<string>`
- `write(data: ClipboardItems): Promise<void>`
- `writeText(data: string): Promise<void>`

#### Notifications API (`window.Notification`)
Constructor: `new Notification(title: string, options?: NotificationOptions)`
- Static: `Notification.requestPermission(): Promise<NotificationPermission>`, `Notification.permission: NotificationPermission`
- `title: string`, `body: string`, `icon: string`, `tag: string`, `close(): void`, `onclick`, `onclose`, `onerror`.

#### Screen Orientation & Screen Wake Lock
- **`screen.orientation: ScreenOrientation`:** `type`, `angle`, `lock(orientation: OrientationLockType): Promise<void>`, `unlock(): void`, `onchange`.
- **`navigator.wakeLock`:**
  - `request(type: "screen"): Promise<WakeLockSentinel>`
  - `WakeLockSentinel`: `released: boolean`, `type: "screen"`, `release(): Promise<void>`, `onrelease`.

#### Web Share API
- `navigator.canShare(data?: ShareData): boolean`
- `navigator.share(data?: ShareData): Promise<void>`

---

## 3. Implementation Plan for Wasm Runtime
1. **Direct Memory Mapping for `crypto.getRandomValues`:**
   - In Wasm, `crypto.getRandomValues(uint8Array)` provides the memory pointer and length to host.
   - Host executes native `window.crypto.getRandomValues(new Uint8Array(wasmMemory.buffer, ptr, len))` in place with zero allocation.
2. **Observer Callback Bridge:**
   - Observers register a Wasm callback ID. When mutations, resizes, or intersections occur on the host, the entries are wrapped in lightweight proxy handles and dispatched directly into QuickJS.
