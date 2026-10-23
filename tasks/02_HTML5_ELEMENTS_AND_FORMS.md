# 📋 Task 02: HTML5 Elements, Forms, Media & File System APIs

## 1. Scope & Objective
Deliver 100% interface, property, method, and constructor coverage for all HTML5 elements derived from `HTMLElement`, form controls, validation states, multimedia elements (`<audio>`, `<video>`, `<img>`), interactive dialogs, iframes, and the browser File/Blob subsystems.

---

## 2. API Surface & Interface Inventory

### 2.1 Base Interface: `HTMLElement`
Inherits from `Element`. Root interface for all HTML elements.
- **Properties:**
  - `accessKey: string`, `contentEditable: string`, `isContentEditable: boolean`
  - `dataset: DOMStringMap` (Transparent proxy mapping `data-user-id` <-> `dataset.userId`)
  - `dir: string`, `draggable: boolean`, `enterKeyHint: string`, `hidden: boolean`, `inert: boolean`
  - `innerText: string`, `outerText: string` (Rendered text getters/setters)
  - `lang: string`, `nonce: string`, `spellcheck: boolean`, `tabIndex: number`
  - `translate: boolean`, `title: string`, `autofocus: boolean`
- **Methods:**
  - `click(): void`
  - `focus(options?: FocusOptions): void`
  - `blur(): void`

---

### 2.2 Form Controls & Data Binding

#### `HTMLInputElement`
- **Properties:**
  - State & Values: `type: string`, `value: string`, `valueAsDate: Date | null`, `valueAsNumber: number`, `checked: boolean`, `defaultChecked: boolean`, `defaultValue: string`, `disabled: boolean`
  - Form attributes: `name: string`, `placeholder: string`, `readOnly: boolean`, `required: boolean`, `pattern: string`, `min: string`, `max: string`, `step: string`, `maxLength: number`, `minLength: number`, `size: number`, `multiple: boolean`
  - Files & Form references: `files: FileList | null`, `form: HTMLFormElement | null`, `formAction: string`, `formEnctype: string`, `formMethod: string`, `formNoValidate: boolean`, `formTarget: string`
  - Text Selection: `selectionStart: number | null`, `selectionEnd: number | null`, `selectionDirection: "forward" | "backward" | "none" | null`
  - Validation: `validity: ValidityState`, `validationMessage: string`, `willValidate: boolean`
- **Methods:**
  - `select(): void`
  - `setSelectionRange(start: number | null, end: number | null, direction?: "forward" | "backward" | "none"): void`
  - `setRangeText(replacement: string, start?: number, end?: number, selectionMode?: SelectionMode): void`
  - `stepUp(n?: number): void`
  - `stepDown(n?: number): void`
  - `checkValidity(): boolean`
  - `reportValidity(): boolean`
  - `setCustomValidity(error: string): void`

#### `HTMLTextAreaElement`
- `value: string`, `rows: number`, `cols: number`, `wrap: string`, `defaultValue: string`, `textLength: number`, `selectionStart`, `selectionEnd`, `select()`, `setSelectionRange()`, `checkValidity()`.

#### `HTMLSelectElement` & `HTMLOptionElement`
- `HTMLSelectElement`: `options: HTMLOptionsCollection`, `selectedIndex: number`, `value: string`, `length: number`, `multiple: boolean`, `selectedOptions: HTMLCollectionOf<HTMLOptionElement>`, `add(item: HTMLOptionElement | HTMLOptGroupElement, before?: HTMLElement | number | null): void`, `remove(index?: number): void`.
- `HTMLOptionElement`: `selected: boolean`, `value: string`, `text: string`, `defaultSelected: boolean`, `index: number`. Constructor support: `new Option(text?, value?, defaultSelected?, selected?)`.

#### `HTMLFormElement`
- `action: string`, `method: string`, `enctype: string`, `target: string`, `name: string`, `noValidate: boolean`
- `elements: HTMLFormControlsCollection`, `length: number`
- `submit(): void`, `reset(): void`, `requestSubmit(submitter?: HTMLElement | null): void`, `checkValidity(): boolean`, `reportValidity(): boolean`.

#### `FormData` (Constructor & Methods)
Constructor: `new FormData(form?: HTMLFormElement, submitter?: HTMLElement | null)`
- `append(name: string, value: string | Blob, fileName?: string): void`
- `delete(name: string): void`
- `get(name: string): FormDataEntryValue | null`
- `getAll(name: string): FormDataEntryValue[]`
- `has(name: string): boolean`
- `set(name: string, value: string | Blob, fileName?: string): void`
- Iterators: `entries()`, `keys()`, `values()`, `forEach(callback: (value: FormDataEntryValue, key: string, parent: FormData) => void)`.

---

### 2.3 File API & Binary Blobs

#### `Blob`
Constructor: `new Blob(blobParts?: BlobPart[], options?: BlobPropertyBag)`
- **Properties:** `size: number`, `type: string`
- **Methods:**
  - `slice(start?: number, end?: number, contentType?: string): Blob`
  - `arrayBuffer(): Promise<ArrayBuffer>` (Transfers bytes directly into Wasm memory)
  - `text(): Promise<string>`
  - `stream(): ReadableStream`

#### `File`
Inherits from `Blob`.
Constructor: `new File(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag)`
- **Properties:** `name: string`, `lastModified: number`

#### `FileReader`
Constructor: `new FileReader()`
- **Constants:** `EMPTY = 0`, `LOADING = 1`, `DONE = 2`
- **Properties:** `readyState: number`, `result: string | ArrayBuffer | null`, `error: DOMException | null`
- **Methods:** `readAsArrayBuffer(blob: Blob): void`, `readAsDataURL(blob: Blob): void`, `readAsText(blob: Blob, encoding?: string): void`, `readAsBinaryString(blob: Blob): void`, `abort(): void`.
- **Event Handlers:** `onloadstart`, `onprogress`, `onload`, `onabort`, `onerror`, `onloadend`.

---

### 2.4 Multimedia Elements (`<audio>`, `<video>`, `<img>`)

#### `HTMLMediaElement` (Base for Audio & Video)
- **State Properties:**
  - `src: string`, `currentSrc: string`, `crossOrigin: string | null`, `preload: string`
  - `networkState: number` (`NETWORK_EMPTY=0`, `NETWORK_IDLE=1`, `NETWORK_LOADING=2`, `NETWORK_NO_SOURCE=3`)
  - `readyState: number` (`HAVE_NOTHING=0`, `HAVE_METADATA=1`, `HAVE_CURRENT_DATA=2`, `HAVE_FUTURE_DATA=3`, `HAVE_ENOUGH_DATA=4`)
  - `currentTime: number`, `duration: number`, `paused: boolean`, `defaultPlaybackRate: number`, `playbackRate: number`
  - `played: TimeRanges`, `seekable: TimeRanges`, `buffered: TimeRanges`, `ended: boolean`, `autoplay: boolean`, `loop: boolean`
  - `controls: boolean`, `volume: number`, `muted: boolean`, `defaultMuted: boolean`
- **Methods:**
  - `load(): void`
  - `canPlayType(type: string): CanPlayTypeResult`
  - `play(): Promise<void>`
  - `pause(): void`
  - `fastSeek(time: number): void`
- **Events:** `canplay`, `canplaythrough`, `durationchange`, `emptied`, `ended`, `error`, `loadeddata`, `loadedmetadata`, `loadstart`, `pause`, `play`, `playing`, `progress`, `ratechange`, `seeked`, `seeking`, `stalled`, `suspend`, `timeupdate`, `volumechange`, `waiting`.

#### `HTMLVideoElement`
Inherits from `HTMLMediaElement`.
- `width: number`, `height: number`, `videoWidth: number`, `videoHeight: number`, `poster: string`, `playsInline: boolean`
- `requestPictureInPicture(): Promise<PictureInPictureWindow>`, `getVideoPlaybackQuality(): VideoPlaybackQuality`.

#### `HTMLAudioElement`
Inherits from `HTMLMediaElement`.
- Constructor support: `new Audio(src?: string)`

#### `HTMLImageElement`
Constructor support: `new Image(width?: number, height?: number)`
- `src: string`, `alt: string`, `width: number`, `height: number`, `naturalWidth: number`, `naturalHeight: number`
- `complete: boolean`, `currentSrc: string`, `loading: "eager" | "lazy"`, `decoding: "async" | "sync" | "auto"`
- `decode(): Promise<void>`

---

### 2.5 Canvas, Dialog, IFrame & Embedded Elements

#### `HTMLCanvasElement`
- `width: number`, `height: number`
- `getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null`
- `getContext(contextId: "webgl" | "webgl2", options?: WebGLContextAttributes): WebGLRenderingContext | WebGL2RenderingContext | null`
- `toDataURL(type?: string, quality?: any): string`
- `toBlob(callback: BlobCallback, type?: string, quality?: any): void`
- `transferControlToOffscreen(): OffscreenCanvas`

#### `HTMLDialogElement`
- `open: boolean`, `returnValue: string`
- `show(): void`, `showModal(): void`, `close(returnValue?: string): void`

#### `HTMLIFrameElement`
- `src: string`, `srcdoc: string`, `name: string`, `sandbox: DOMTokenList`, `allow: string`, `allowFullscreen: boolean`
- `width: string`, `height: string`, `contentWindow: WindowProxy | null`, `contentDocument: Document | null`

---

## 3. Implementation Plan for Wasm Runtime
1. **Constructor Registry:**
   - Map `Audio`, `Image`, `Option`, `FormData`, `Blob`, `File`, `FileReader` constructors inside QuickJS `globalThis` to call the `NEW` bridge command when invoked with `new`.
2. **Buffer Bridge for Files & Blobs:**
   - When `.arrayBuffer()` is invoked on a `Blob`/`File`, the host copies bytes directly into Wasm linear memory at an allocated offset, avoiding JSON Base64 overhead.
3. **Form Data Serialization:**
   - Map `HTMLFormElement.elements` to dynamic proxies supporting both numeric indexing (`form[0]`) and named property access (`form['username']`).
