# 📋 Task 05: Canvas 2D, OffscreenCanvas, Imaging & Pixel Manipulation APIs

## 1. Scope & Objective
Deliver high-performance Wasm-to-host virtualization for HTML5 Canvas 2D graphics rendering (`CanvasRenderingContext2D`), `OffscreenCanvas`, paths (`Path2D`), gradients, patterns, text metrics, image drawing, and raw pixel manipulation (`ImageData`, `Uint8ClampedArray`). Ensure zero lag and support 60 FPS interactive game loops through command batching and direct memory mapping.

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: `HTMLCanvasElement` & `OffscreenCanvas`
- **Properties:**
  - `width: number`, `height: number` (Mutating clears the canvas)
- **Methods:**
  - `getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null`
  - `toDataURL(type?: string, quality?: any): string`
  - `toBlob(callback: BlobCallback, type?: string, quality?: any): void`
  - `transferControlToOffscreen(): OffscreenCanvas`

---

### 2.2 Interface: `CanvasRenderingContext2D`

#### 1. Canvas State & Stack
- `canvas: HTMLCanvasElement` (Back-reference)
- `save(): void` (Pushes state: transform, clip, styles)
- `restore(): void` (Pops state)
- `reset(): void`

#### 2. Transformations & Coordinate System
- `scale(x: number, y: number): void`
- `rotate(angle: number): void` (Radians)
- `translate(x: number, y: number): void`
- `transform(a: number, b: number, c: number, d: number, e: number, f: number): void`
- `setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void`
- `setTransform(transform?: DOMMatrix2DInit): void`
- `getTransform(): DOMMatrix`
- `resetTransform(): void`

#### 3. Compositing, Shadows & Alpha
- `globalAlpha: number` (0.0 to 1.0)
- `globalCompositeOperation: GlobalCompositeOperation` ("source-over", "source-in", "source-out", "source-atop", "destination-over", "destination-in", "destination-out", "destination-atop", "lighter", "copy", "xor", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity")
- `shadowBlur: number`, `shadowColor: string`, `shadowOffsetX: number`, `shadowOffsetY: number`
- `filter: string` (e.g. "blur(4px)", "contrast(150%)")

#### 4. Fill & Stroke Styles
- `fillStyle: string | CanvasGradient | CanvasPattern` (Getter & Setter)
- `strokeStyle: string | CanvasGradient | CanvasPattern` (Getter & Setter)
- `createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient`
- `createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient`
- `createConicGradient(startAngle: number, x: number, y: number): CanvasGradient`
- `createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null`

#### 5. Line Styles
- `lineWidth: number`
- `lineCap: CanvasLineCap` ("butt" | "round" | "square")
- `lineJoin: CanvasLineJoin` ("round" | "bevel" | "miter")
- `miterLimit: number`
- `getLineDash(): number[]`
- `setLineDash(segments: number[]): void`
- `lineDashOffset: number`

#### 6. Rectangles & Fast Clears
- `clearRect(x: number, y: number, w: number, h: number): void`
- `fillRect(x: number, y: number, w: number, h: number): void`
- `strokeRect(x: number, y: number, w: number, h: number): void`

#### 7. Paths & Geometries
- `beginPath(): void`
- `closePath(): void`
- `moveTo(x: number, y: number): void`
- `lineTo(x: number, y: number): void`
- `bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void`
- `quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void`
- `arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void`
- `arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void`
- `ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void`
- `rect(x: number, y: number, w: number, h: number): void`
- `roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]): void`
- `fill(fillRule?: CanvasFillRule): void`
- `fill(path: Path2D, fillRule?: CanvasFillRule): void`
- `stroke(): void`
- `stroke(path: Path2D): void`
- `clip(fillRule?: CanvasFillRule): void`
- `clip(path: Path2D, fillRule?: CanvasFillRule): void`
- `isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean`
- `isPointInStroke(x: number, y: number): boolean`

#### 8. Text Rendering & Metrics
- `font: string` (e.g. "bold 16px sans-serif")
- `textAlign: CanvasTextAlign` ("left" | "right" | "center" | "start" | "end")
- `textBaseline: CanvasTextBaseline` ("top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom")
- `direction: CanvasDirection` ("ltr" | "rtl" | "inherit")
- `fillText(text: string, x: number, y: number, maxWidth?: number): void`
- `strokeText(text: string, x: number, y: number, maxWidth?: number): void`
- `measureText(text: string): TextMetrics`
  - `TextMetrics`: `width`, `actualBoundingBoxLeft`, `actualBoundingBoxRight`, `fontBoundingBoxAscent`, `fontBoundingBoxDescent`, `actualBoundingBoxAscent`, `actualBoundingBoxDescent`, `emHeightAscent`, `emHeightDescent`.

#### 9. Image Drawing & Sprite Blitting
- `drawImage(image: CanvasImageSource, dx: number, dy: number): void`
- `drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void`
- `drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void`
  - `CanvasImageSource`: `HTMLImageElement | SVGImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas`.

#### 10. Pixel Manipulation & ImageData
- `createImageData(sw: number, sh: number, settings?: ImageDataSettings): ImageData`
- `createImageData(imagedata: ImageData): ImageData`
- `getImageData(sx: number, sy: number, sw: number, sh: number, settings?: ImageDataSettings): ImageData`
- `putImageData(imagedata: ImageData, dx: number, dy: number): void`
- `putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void`

---

### 2.3 Supporting Graphics Interfaces
- **`Path2D`:** Constructor `new Path2D(path?: Path2D | string)`. Contains all path drawing commands.
- **`CanvasGradient`:** `addColorStop(offset: number, color: string): void`.
- **`CanvasPattern`:** `setTransform(transform?: DOMMatrix2DInit): void`.
- **`ImageData`:**
  - Constructor: `new ImageData(width: number, height: number, settings?: ImageDataSettings)`, `new ImageData(data: Uint8ClampedArray, width: number, height?: number, settings?: ImageDataSettings)`.
  - Properties: `width: number`, `height: number`, `data: Uint8ClampedArray`, `colorSpace: PredefinedColorSpace`.

---

## 3. High-Performance Execution Architecture (60 FPS Game Loop)

Canvas games can perform 5,000+ draw calls per frame. Sending individual synchronous RPC calls would cause severe latency.
1. **Canvas Command Batching Buffer:**
   - In Wasm, draw calls (`fillRect`, `drawImage`, `setTransform`, `fillStyle`) serialize compact binary opcodes into a shared command buffer in Wasm memory:
     ```text
     [OP_FILL_RECT: 1 byte][x: 4 bytes][y: 4 bytes][w: 4 bytes][h: 4 bytes]
     [OP_SET_FILL_STYLE: 1 byte][color_id: 2 bytes]
     ```
   - At the end of the frame or when reading back pixels (`getImageData`, `measureText`), the buffer flushes to the host in a single call, achieving native 60 FPS performance.
2. **Direct Memory Mapping for `ImageData`:**
   - When `createImageData` or `getImageData` is invoked, the `Uint8ClampedArray` points directly into an allocated region of Wasm linear memory. Modifying pixels in Wasm updates host graphics with zero serialization overhead.
