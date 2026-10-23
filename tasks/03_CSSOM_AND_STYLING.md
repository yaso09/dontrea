# 📋 Task 03: CSSOM, Styling, Viewport Geometry & Animation APIs

## 1. Scope & Objective
Provide complete Wasm-to-host virtualization for CSS Object Model (CSSOM), inline and computed style manipulation (`element.style`, `window.getComputedStyle`), stylesheet manipulation (`CSSStyleSheet`, dynamic rules), CSS Typed OM, CSS transitions/animations, media queries (`matchMedia`), and full element/window viewport geometry (`getBoundingClientRect`, scroll properties, offset/client dimensions).

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: `CSSStyleDeclaration`
The interface returned by `element.style` and `window.getComputedStyle()`.
- **Properties:**
  - `cssText: string` (Getter & Setter)
  - `length: number`
  - `parentRule: CSSRule | null`
  - All standard CSS properties as camelCase and kebab-case getters/setters:
    `color`, `backgroundColor`, `fontSize`, `display`, `position`, `top`, `right`, `bottom`, `left`, `width`, `height`, `margin`, `padding`, `border`, `transform`, `opacity`, `zIndex`, `transition`, `animation`, `flex`, `grid`, etc.
- **Methods:**
  - `getPropertyValue(property: string): string`
  - `getPropertyPriority(property: string): string` ("important" or "")
  - `setProperty(property: string, value: string | null, priority?: string): void`
  - `removeProperty(property: string): string`
  - `item(index: number): string`
- **Implementation Strategy:**
  - Wrapped in a dedicated proxy that traps camelCase property access (e.g. `el.style.backgroundColor = 'red'`) and converts it to a fast-path RPC `SET_STYLE` command.

---

### 2.2 Global Styling: `window.getComputedStyle`
- **Signature:**
  `window.getComputedStyle(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration`
- **Behavior in Wasm:**
  - Returns a read-only `CSSStyleDeclaration` handle.
  - Property mutations on the returned object throw a `TypeError` matching native browser behavior.

---

### 2.3 Stylesheets & CSS Rules

#### `CSSStyleSheet`
Inherits from `StyleSheet`.
- **Properties:**
  - `cssRules: CSSRuleList`, `rules: CSSRuleList`
  - `disabled: boolean`, `href: string | null`, `media: MediaList`, `ownerNode: Element | ProcessingInstruction | null`
  - `parentStyleSheet: CSSStyleSheet | null`, `title: string | null`, `type: string`
- **Methods:**
  - `insertRule(rule: string, index?: number): number`
  - `deleteRule(index: number): void`
  - `replace(text: string): Promise<CSSStyleSheet>`
  - `replaceSync(text: string): void`

#### `CSSRule` Hierarchy
- `CSSRule.STYLE_RULE = 1`, `CSSRule.IMPORT_RULE = 3`, `CSSRule.MEDIA_RULE = 4`, `CSSRule.FONT_FACE_RULE = 5`, `CSSRule.PAGE_RULE = 6`, `CSSRule.KEYFRAMES_RULE = 7`, `CSSRule.KEYFRAME_RULE = 8`, `CSSRule.SUPPORTS_RULE = 12`.
- Specialized interfaces:
  - `CSSStyleRule`: `selectorText: string`, `style: CSSStyleDeclaration`.
  - `CSSMediaRule`: `media: MediaList`, `cssRules: CSSRuleList`.
  - `CSSKeyframesRule`: `name: string`, `cssRules: CSSRuleList`, `appendRule(rule: string)`, `deleteRule(select: string)`, `findRule(select: string)`.

---

### 2.4 CSSOM View, Geometry & Scroll APIs

#### Element Geometry Measurements
- **Methods:**
  - `getBoundingClientRect(): DOMRect`
  - `getClientRects(): DOMRectList`
  - `scroll(options?: ScrollToOptions | number, y?: number): void`
  - `scrollTo(options?: ScrollToOptions | number, y?: number): void`
  - `scrollBy(options?: ScrollToOptions | number, y?: number): void`
  - `scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void`
- **Properties (Read-Only Layout Dimensions):**
  - `clientTop: number`, `clientLeft: number`, `clientWidth: number`, `clientHeight: number`
  - `offsetTop: number`, `offsetLeft: number`, `offsetWidth: number`, `offsetHeight: number`, `offsetParent: Element | null`
- **Properties (Scrollable Dimensions):**
  - `scrollTop: number` (Getter & Setter)
  - `scrollLeft: number` (Getter & Setter)
  - `scrollWidth: number` (Read-only)
  - `scrollHeight: number` (Read-only)

#### Geometry Objects
1. **`DOMRect` & `DOMRectReadOnly`:**
   - Constructor: `new DOMRect(x?: number, y?: number, width?: number, height?: number)`
   - Properties: `x: number`, `y: number`, `width: number`, `height: number`, `top: number`, `right: number`, `bottom: number`, `left: number`
   - Static: `DOMRect.fromRect(other?: DOMRectInit): DOMRect`
2. **`DOMPoint` & `DOMPointReadOnly`:**
   - Constructor: `new DOMPoint(x?: number, y?: number, z?: number, w?: number)`
   - Methods: `matrixTransform(matrix?: DOMMatrixInit): DOMPoint`
3. **`DOMMatrix` & `DOMMatrixReadOnly`:**
   - Full 2D/3D affine matrix transformations: `translate()`, `scale()`, `rotate()`, `multiply()`, `inverse()`.

---

### 2.5 Media Queries: `window.matchMedia`
- **Signature:** `window.matchMedia(query: string): MediaQueryList`
- **Interface: `MediaQueryList`**
  - Inherits from `EventTarget`.
  - Properties: `matches: boolean`, `media: string`
  - Event Handlers: `onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null`
  - Methods: `addListener(listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any): void`, `removeListener(...)`.

---

### 2.6 Web Animations API
- `Element.animate(keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions): Animation`
- `Element.getAnimations(options?: GetAnimationsOptions): Animation[]`
- **Interface: `Animation`**
  - `currentTime: CSSNumberish | null`, `playbackRate: number`, `playState: AnimationPlayState`, `ready: Promise<Animation>`, `finished: Promise<Animation>`
  - `play(): void`, `pause(): void`, `finish(): void`, `cancel(): void`, `reverse(): void`.

---

## 3. Implementation Plan for Wasm Runtime
1. **Batching Style Mutations:**
   - Frequently mutating properties (e.g. `el.style.left = x + 'px'; el.style.top = y + 'px'`) are batched into a single microtask frame update to ensure 60 FPS performance.
2. **Fast-Path Value Caching for Geometry:**
   - `getBoundingClientRect()` transfers the 8 primitive numbers (`x, y, w, h, t, r, b, l`) in a single packed binary array rather than creating 8 round-trip calls.
