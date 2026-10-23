# 📋 Task 08: Network I/O, Fetch API, WebSockets, XHR & Real-Time Communication

## 1. Scope & Objective
Provide complete Wasm-to-host virtualization for all client-side network communication protocols: the modern `fetch()` API (`Request`, `Response`, `Headers`), `AbortController` cancellation signals, legacy `XMLHttpRequest` (XHR Level 2), full-duplex `WebSocket` channels, Server-Sent Events (`EventSource`), inter-tab communication (`BroadcastChannel`), and peer-to-peer real-time networking via `WebRTC` (`RTCPeerConnection`, `RTCDataChannel`).

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: Fetch API (`fetch`, `Request`, `Response`, `Headers`)

#### Global Function: `fetch`
- **Signature:** `fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>`
- **Execution in Wasm:**
  - Wasm packs the request descriptor (`url`, `method`, `headers`, `body`, `credentials`, `signal`).
  - Host initiates the native asynchronous fetch request and returns a Promise handle to QuickJS.
  - On resolution, host registers a `Response` handle proxy.

#### `Headers`
Constructor: `new Headers(init?: HeadersInit)`
- **Methods:**
  - `append(name: string, value: string): void`
  - `delete(name: string): void`
  - `get(name: string): string | null`
  - `getSetCookie(): string[]`
  - `has(name: string): boolean`
  - `set(name: string, value: string): void`
  - Iterators: `entries()`, `keys()`, `values()`, `forEach()`

#### `Request`
Constructor: `new Request(input: RequestInfo | URL, init?: RequestInit)`
- **Properties:**
  - `method: string`, `url: string`, `headers: Headers`
  - `body: ReadableStream<Uint8Array> | null`, `bodyUsed: boolean`
  - `mode: RequestMode` ("cors" | "no-cors" | "same-origin" | "navigate")
  - `credentials: RequestCredentials` ("omit" | "same-origin" | "include")
  - `cache: RequestCache`, `redirect: RequestRedirect`, `referrer: string`, `integrity: string`
  - `signal: AbortSignal`
- **Body Consumer Mixins:**
  - `arrayBuffer(): Promise<ArrayBuffer>`, `blob(): Promise<Blob>`, `formData(): Promise<FormData>`, `json(): Promise<any>`, `text(): Promise<string>`, `clone(): Request`

#### `Response`
Constructor: `new Response(body?: BodyInit | null, init?: ResponseInit)`
- **Properties:**
  - `headers: Headers`, `ok: boolean`, `redirected: boolean`
  - `status: number`, `statusText: string`, `type: ResponseType`, `url: string`
  - `body: ReadableStream<Uint8Array> | null`, `bodyUsed: boolean`
- **Static Factory Methods:**
  - `Response.error(): Response`, `Response.redirect(url: string | URL, status?: number): Response`, `Response.json(data: any, init?: ResponseInit): Response`
- **Body Consumer Mixins:**
  - `arrayBuffer(): Promise<ArrayBuffer>`, `blob(): Promise<Blob>`, `formData(): Promise<FormData>`, `json(): Promise<any>`, `text(): Promise<string>`, `clone(): Response`

#### `AbortController` & `AbortSignal`
- **`AbortController`:** Constructor `new AbortController()`. Properties: `signal: AbortSignal`. Methods: `abort(reason?: any): void`.
- **`AbortSignal`:** Inherits from `EventTarget`.
  - Properties: `aborted: boolean`, `reason: any`, `onabort: ((this: AbortSignal, ev: Event) => any) | null`
  - Static: `AbortSignal.abort(reason?: any): AbortSignal`, `AbortSignal.timeout(milliseconds: number): AbortSignal`.
  - Methods: `throwIfAborted(): void`.

---

### 2.2 Interface: `XMLHttpRequest` (XHR Level 2)
Constructor: `new XMLHttpRequest()`
- **Constants (ReadyState):**
  - `UNSENT = 0`, `OPENED = 1`, `HEADERS_RECEIVED = 2`, `LOADING = 3`, `DONE = 4`
- **Properties:**
  - `readyState: number`, `status: number`, `statusText: string`, `responseURL: string`
  - `response: any`, `responseText: string`, `responseXML: Document | null`
  - `responseType: XMLHttpRequestResponseType` ("" | "arraybuffer" | "blob" | "document" | "json" | "text")
  - `timeout: number`, `withCredentials: boolean`
  - `upload: XMLHttpRequestUpload`
- **Methods:**
  - `open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void`
  - `send(body?: Document | XMLHttpRequestBodyInit | null): void`
  - `abort(): void`
  - `setRequestHeader(name: string, value: string): void`
  - `getResponseHeader(name: string): string | null`
  - `getAllResponseHeaders(): string`
  - `overrideMimeType(mime: string): void`
- **Event Handlers:**
  - `onreadystatechange`, `onloadstart`, `onprogress`, `onabort`, `onerror`, `onload`, `ontimeout`, `onloadend`.

---

### 2.3 Interface: `WebSocket` (Full-Duplex Streaming)
Constructor: `new WebSocket(url: string | URL, protocols?: string | string[])`
- **Constants (ReadyState):**
  - `CONNECTING = 0`, `OPEN = 1`, `CLOSING = 2`, `CLOSED = 3`
- **Properties:**
  - `url: string`, `readyState: number`, `bufferedAmount: number`, `extensions: string`, `protocol: string`
  - `binaryType: BinaryType` ("blob" | "arraybuffer")
- **Methods:**
  - `send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void` (Direct byte pointer transfer)
  - `close(code?: number, reason?: string): void`
- **Event Handlers:**
  - `onopen: ((this: WebSocket, ev: Event) => any) | null`
  - `onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null`
  - `onerror: ((this: WebSocket, ev: Event) => any) | null`
  - `onclose: ((this: WebSocket, ev: CloseEvent) => any) | null`

---

### 2.4 Server-Sent Events & Inter-Tab Messaging

#### `EventSource` (SSE)
Constructor: `new EventSource(url: string | URL, eventSourceInitDict?: EventSourceInit)`
- `readyState: number` (`CONNECTING = 0`, `OPEN = 1`, `CLOSED = 2`), `url: string`, `withCredentials: boolean`
- `close(): void`, `onopen`, `onmessage`, `onerror`.

#### `BroadcastChannel`
Constructor: `new BroadcastChannel(name: string)`
- `name: string`, `postMessage(message: any): void`, `close(): void`, `onmessage`, `onmessageerror`.

---

### 2.5 Real-Time Communication: `WebRTC`

#### `RTCPeerConnection`
Constructor: `new RTCPeerConnection(configuration?: RTCConfiguration)`
- **Properties:**
  - `connectionState: RTCPeerConnectionState`, `iceConnectionState: RTCIceConnectionState`, `signalingState: RTCSignalingState`
  - `localDescription: RTCSessionDescription | null`, `remoteDescription: RTCSessionDescription | null`
- **Methods:**
  - `createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>`
  - `createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>`
  - `setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void>`
  - `setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>`
  - `addIceCandidate(candidate?: RTCIceCandidateInit | RTCIceCandidate): Promise<void>`
  - `createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel`
  - `addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender`
  - `removeTrack(sender: RTCRtpSender): void`
  - `close(): void`

#### `RTCDataChannel`
- `label: string`, `readyState: RTCDataChannelState` ("connecting" | "open" | "closing" | "closed")
- `bufferedAmount: number`, `maxPacketLifeTime: number | null`, `maxRetransmits: number | null`, `ordered: boolean`
- `send(data: string | Blob | ArrayBuffer | ArrayBufferView): void`, `close(): void`, `onopen`, `onmessage`, `onerror`, `onclose`.

---

## 3. Implementation Plan for Wasm Runtime
1. **Asynchronous Promise Resolution in QuickJS:**
   - When `fetch()` is executed in Wasm, QuickJS allocates a native `Promise`. The host asynchronously settles the Promise via `instance.exports.__uwpe_resolve_promise(promiseId, responseHandle)`.
2. **Binary Zero-Copy Data Streaming for WebSockets:**
   - Binary frames sent via `ws.send(uint8Array)` pass pointer offsets to host Wasm memory; incoming binary messages are written directly into an allocated buffer in Wasm linear memory.
