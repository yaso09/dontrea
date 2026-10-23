# 📋 Task 04: Window, BOM, Navigation, Timers & High-Resolution Performance APIs

## 1. Scope & Objective
Provide full fidelity for the Browser Object Model (BOM): global `window` proxying, `Location`, `History`, `Navigator`, `Screen`, timer scheduling (`setTimeout`, `setInterval`), high-precision animation loops (`requestAnimationFrame`), idle callbacks, URL & URLSearchParams utilities, Base64 encoding (`atob`, `btoa`), cross-origin messaging (`postMessage`), and the `Performance` timeline.

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: `Window` (Global Scope)
- **Self-Referential Globals:**
  - `window === globalThis`, `self === window`, `top: WindowProxy`, `parent: WindowProxy`, `frames: WindowProxy`
- **Dialogs & User Prompts:**
  - `alert(message?: any): void`
  - `confirm(message?: string): boolean`
  - `prompt(message?: string, defaultText?: string): string | null`
- **Window Management & Frame Properties:**
  - `open(url?: string | URL, target?: string, features?: string): WindowProxy | null`
  - `close(): void`, `closed: boolean`, `opener: any`
  - `focus(): void`, `blur(): void`, `print(): void`, `stop(): void`
  - `name: string`, `status: string`
- **Dimensions & Coordinate Geometry:**
  - `innerWidth: number`, `innerHeight: number`
  - `outerWidth: number`, `outerHeight: number`
  - `screenX: number`, `screenY: number`, `screenLeft: number`, `screenTop: number`
  - `scrollX: number`, `scrollY: number`, `pageXOffset: number`, `pageYOffset: number`
  - `devicePixelRatio: number`
- **Binary & URL String Utilities:**
  - `atob(data: string): string`
  - `btoa(data: string): string`
- **Cross-Document Messaging:**
  - `postMessage(message: any, targetOrigin: string, transfer?: Transferable[]): void`
  - `onmessage: ((this: Window, ev: MessageEvent) => any) | null`
  - `onmessageerror: ((this: Window, ev: MessageEvent) => any) | null`

---

### 2.2 Timers, Animation & Task Queues

#### Microtask & Macrotask Scheduling
- **`setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number`**
- **`clearTimeout(id: number | undefined): void`**
- **`setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number`**
- **`clearInterval(id: number | undefined): void`**
- **`queueMicrotask(callback: VoidFunction): void`**

#### High-Performance Animation Frame Loop
- **`requestAnimationFrame(callback: FrameRequestCallback): number`**
  - Callback receives `DOMHighResTimeStamp` (`performance.now()`).
- **`cancelAnimationFrame(handle: number): void`**
- **`requestIdleCallback(callback: IdleRequestCallback, options?: IdleRequestOptions): number`**
- **`cancelIdleCallback(handle: number): void`**

---

### 2.3 Navigation & History APIs

#### `Location` (URL & Redirection)
- **Properties (Read/Write):**
  - `href: string` (Setting navigates the page)
  - `protocol: string`, `host: string`, `hostname: string`, `port: string`
  - `pathname: string`, `search: string`, `hash: string`
  - `origin: string` (Read-only)
- **Methods:**
  - `assign(url: string | URL): void`
  - `replace(url: string | URL): void`
  - `reload(): void`

#### `History` (Session History)
- **Properties:**
  - `length: number`
  - `state: any`
  - `scrollRestoration: ScrollRestoration` ("auto" | "manual")
- **Methods:**
  - `back(): void`
  - `forward(): void`
  - `go(delta?: number): void`
  - `pushState(data: any, unused: string, url?: string | URL | null): void`
  - `replaceState(data: any, unused: string, url?: string | URL | null): void`

---

### 2.4 Interface: `Navigator` (Device & Browser Capabilities)
- **Hardware & Platform Properties:**
  - `userAgent: string`, `platform: string`
  - `language: string`, `languages: readonly string[]`
  - `hardwareConcurrency: number` (CPU cores)
  - `deviceMemory?: number` (RAM in GB)
  - `maxTouchPoints: number`
  - `onLine: boolean`, `cookieEnabled: boolean`, `webdriver: boolean`
- **Methods:**
  - `sendBeacon(url: string | URL, data?: BodyInit | null): boolean`
  - `vibrate(pattern: VibratePattern): boolean`

---

### 2.5 URL & URLSearchParams Utilities

#### `URL`
Constructor: `new URL(url: string | URL, base?: string | URL)`
- **Properties:** `href`, `origin`, `protocol`, `username`, `password`, `host`, `hostname`, `port`, `pathname`, `search`, `searchParams: URLSearchParams`, `hash`
- **Methods:** `toJSON(): string`, `toString(): string`
- **Static Methods:**
  - `createObjectURL(obj: Blob | MediaSource): string`
  - `revokeObjectURL(url: string): void`

#### `URLSearchParams`
Constructor: `new URLSearchParams(init?: string[][] | Record<string, string> | string | URLSearchParams)`
- `append(name: string, value: string): void`
- `delete(name: string): void`
- `get(name: string): string | null`
- `getAll(name: string): string[]`
- `has(name: string): boolean`
- `set(name: string, value: string): void`
- `sort(): void`
- Iterators: `entries()`, `keys()`, `values()`, `forEach()`

---

### 2.6 High-Resolution Performance API

#### `Performance`
Accessible via `window.performance`.
- **Properties:**
  - `timeOrigin: DOMHighResTimeStamp`
  - `timing: PerformanceTiming`, `navigation: PerformanceNavigation`
- **Methods:**
  - `now(): DOMHighResTimeStamp` (Sub-millisecond high-precision monotonic clock)
  - `mark(markName: string, markOptions?: PerformanceMarkOptions): PerformanceMark`
  - `measure(measureName: string, startOrMeasureOptions?: string | PerformanceMeasureOptions, endMark?: string): PerformanceMeasure`
  - `getEntries(): PerformanceEntryList`
  - `getEntriesByType(type: string): PerformanceEntryList`
  - `getEntriesByName(name: string, type?: string): PerformanceEntryList`
  - `clearMarks(markName?: string): void`
  - `clearMeasures(measureName?: string): void`

---

## 3. Implementation Plan for Wasm Runtime
1. **Timer & Frame Dispatch Loop:**
   - QuickJS runs inside WebAssembly. When `setTimeout(fn, ms)` or `requestAnimationFrame(fn)` is called inside Wasm:
     - Wasm registers `fn` with an integer `timerId`.
     - Host calls native `setTimeout` / `requestAnimationFrame` with that `timerId`.
     - When fired, host invokes `instance.exports.__uwpe_trigger_timer(timerId, timestamp)`.
2. **`URL` / `URLSearchParams` Optimization:**
   - Evaluated directly inside Wasm QuickJS (or bridged to host if Blob URLs are created).
3. **Synchronous `performance.now()`:**
   - Mapped to WASI `clock_time_get` or a direct imported Wasm function returning `performance.now()`, executing in under 20 nanoseconds.
