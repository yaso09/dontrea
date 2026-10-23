# 📋 Task 06: WebGL, WebGL 2.0, WebGPU & Hardware Acceleration APIs

## 1. Scope & Objective
Enable WebAssembly-compiled JavaScript to run high-performance 3D graphics, shader pipelines, game engines (Three.js, Babylon.js, PixiJS, custom engines), and GPU compute workloads with 100% API fidelity across `WebGLRenderingContext` (WebGL 1.0), `WebGL2RenderingContext` (WebGL 2.0), and the next-generation `WebGPU` standard.

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: `WebGLRenderingContext` (WebGL 1.0)
Acquired via `canvas.getContext("webgl")`.
- **Core Constants (GLenum):**
  - Clear buffers: `COLOR_BUFFER_BIT`, `DEPTH_BUFFER_BIT`, `STENCIL_BUFFER_BIT`
  - Primitives: `POINTS`, `LINES`, `LINE_LOOP`, `LINE_STRIP`, `TRIANGLES`, `TRIANGLE_STRIP`, `TRIANGLE_FAN`
  - Types: `BYTE`, `UNSIGNED_BYTE`, `SHORT`, `UNSIGNED_SHORT`, `INT`, `UNSIGNED_INT`, `FLOAT`
  - Buffer targets: `ARRAY_BUFFER`, `ELEMENT_ARRAY_BUFFER`
  - Usage hints: `STATIC_DRAW`, `DYNAMIC_DRAW`, `STREAM_DRAW`
  - Textures: `TEXTURE_2D`, `TEXTURE_CUBE_MAP`, `RGB`, `RGBA`, `LUMINANCE`, `NEAREST`, `LINEAR`, `CLAMP_TO_EDGE`, `REPEAT`
  - Shaders: `VERTEX_SHADER`, `FRAGMENT_SHADER`, `COMPILE_STATUS`, `LINK_STATUS`
  - Capabilities: `DEPTH_TEST`, `BLEND`, `CULL_FACE`, `SCISSOR_TEST`, `STENCIL_TEST`
- **Buffer Subsystem:**
  - `createBuffer(): WebGLBuffer | null`, `deleteBuffer(buffer: WebGLBuffer | null): void`
  - `bindBuffer(target: GLenum, buffer: WebGLBuffer | null): void`
  - `bufferData(target: GLenum, size: GLsizeiptr, usage: GLenum): void`
  - `bufferData(target: GLenum, data: BufferSource | null, usage: GLenum): void` (Direct pointer memory bridge)
  - `bufferSubData(target: GLenum, offset: GLintptr, data: BufferSource): void`
- **Shader & Program Subsystem:**
  - `createShader(type: GLenum): WebGLShader | null`, `deleteShader(shader: WebGLShader | null): void`
  - `shaderSource(shader: WebGLShader, source: string): void`, `compileShader(shader: WebGLShader): void`
  - `getShaderParameter(shader: WebGLShader, pname: GLenum): any`, `getShaderInfoLog(shader: WebGLShader): string | null`
  - `createProgram(): WebGLProgram | null`, `deleteProgram(program: WebGLProgram | null): void`
  - `attachShader(program: WebGLProgram, shader: WebGLShader): void`, `linkProgram(program: WebGLProgram): void`
  - `getProgramParameter(program: WebGLProgram, pname: GLenum): any`, `getProgramInfoLog(program: WebGLProgram): string | null`
  - `useProgram(program: WebGLProgram | null): void`, `validateProgram(program: WebGLProgram): void`
- **Vertex Attributes & Uniforms:**
  - `getAttribLocation(program: WebGLProgram, name: string): GLint`
  - `enableVertexAttribArray(index: GLuint): void`, `disableVertexAttribArray(index: GLuint): void`
  - `vertexAttribPointer(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean, stride: GLsizei, offset: GLintptr): void`
  - `getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null`
  - Scalar/Vector Uniforms: `uniform1f`, `uniform1i`, `uniform2f`, `uniform2i`, `uniform3f`, `uniform3i`, `uniform4f`, `uniform4i`
  - Array Uniforms: `uniform1fv`, `uniform2fv`, `uniform3fv`, `uniform4fv`, `uniform1iv`, `uniform2iv`, etc.
  - Matrix Uniforms: `uniformMatrix2fv(location, transpose, value)`, `uniformMatrix3fv(location, transpose, value)`, `uniformMatrix4fv(location, transpose, value)`
- **Textures, Framebuffers & Renderbuffers:**
  - `createTexture(): WebGLTexture | null`, `bindTexture(target: GLenum, texture: WebGLTexture | null): void`
  - `texImage2D(target: GLenum, level: GLint, internalformat: GLint, width: GLsizei, height: GLsizei, border: GLint, format: GLenum, type: GLenum, pixels: ArrayBufferView | null): void`
  - `texImage2D(target: GLenum, level: GLint, internalformat: GLint, format: GLenum, type: GLenum, source: TexImageSource): void`
  - `texParameteri(target: GLenum, pname: GLenum, param: GLint): void`, `generateMipmap(target: GLenum): void`, `activeTexture(texture: GLenum): void`
  - `createFramebuffer(): WebGLFramebuffer | null`, `bindFramebuffer(target: GLenum, framebuffer: WebGLFramebuffer | null): void`
  - `framebufferTexture2D(target: GLenum, attachment: GLenum, textarget: GLenum, texture: WebGLTexture | null, level: GLint): void`
  - `createRenderbuffer(): WebGLRenderbuffer | null`, `bindRenderbuffer(target: GLenum, renderbuffer: WebGLRenderbuffer | null): void`
  - `renderbufferStorage(target: GLenum, internalformat: GLenum, width: GLsizei, height: GLsizei): void`
  - `checkFramebufferStatus(target: GLenum): GLenum`
- **Draw Calls & Viewport:**
  - `viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void`
  - `clearColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void`
  - `clear(mask: GLbitfield): void`
  - `drawArrays(mode: GLenum, first: GLint, count: GLsizei): void`
  - `drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void`
- **Extensions:**
  - `getExtension(name: string): any` (e.g. `OES_element_index_uint`, `ANGLE_instanced_arrays`, `WEBGL_depth_texture`, `EXT_texture_filter_anisotropic`)
  - `getSupportedExtensions(): string[]`

---

### 2.2 Interface: `WebGL2RenderingContext` (WebGL 2.0 Additions)
Acquired via `canvas.getContext("webgl2")`. Inherits all WebGL 1.0 methods and constants.
- **Vertex Array Objects (VAO):**
  - `createVertexArray(): WebGLVertexArrayObject | null`, `bindVertexArray(array: WebGLVertexArrayObject | null): void`, `deleteVertexArray(array: WebGLVertexArrayObject | null): void`
- **Uniform Buffer Objects (UBO):**
  - `getUniformBlockIndex(program, uniformBlockName): GLuint`
  - `uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding): void`
  - `bindBufferBase(target: GLenum, index: GLuint, buffer: WebGLBuffer | null): void`
  - `bindBufferRange(target: GLenum, index: GLuint, buffer: WebGLBuffer | null, offset: GLintptr, size: GLsizeiptr): void`
- **3D Textures & 2D Texture Arrays:**
  - `texImage3D()`, `texSubImage3D()`, `texStorage2D()`, `texStorage3D()`
- **Multiple Render Targets (MRT):**
  - `drawBuffers(buffers: GLenum[]): void`, `readBuffer(src: GLenum): void`
- **Transform Feedback & Instanced Drawing:**
  - `createTransformFeedback()`, `bindTransformFeedback()`, `beginTransformFeedback()`, `endTransformFeedback()`
  - `drawArraysInstanced(mode, first, count, instanceCount)`, `drawElementsInstanced(mode, count, type, offset, instanceCount)`
  - `vertexAttribDivisor(index, divisor)`
- **Query & Sync Objects:**
  - `createQuery()`, `beginQuery()`, `endQuery()`, `fenceSync()`, `clientWaitSync()`, `waitSync()`

---

### 2.3 Next-Generation: `WebGPU` API Surface
Accessed via `navigator.gpu`.
- **`GPU` (Entry Point):**
  - `requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>`
  - `getPreferredCanvasFormat(): GPUTextureFormat`
- **`GPUAdapter`:**
  - `features: GPUSupportedFeatures`, `limits: GPUSupportedLimits`, `isFallbackAdapter: boolean`
  - `requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>`
- **`GPUDevice`:**
  - `queue: GPUQueue`
  - Object creation: `createBuffer()`, `createTexture()`, `createSampler()`, `createBindGroupLayout()`, `createPipelineLayout()`, `createBindGroup()`, `createShaderModule()`, `createComputePipeline()`, `createRenderPipeline()`, `createCommandEncoder()`, `createRenderBundleEncoder()`
- **Command Encoding & Execution:**
  - `GPUCommandEncoder`: `beginRenderPass(descriptor)`, `beginComputePass(descriptor)`, `copyBufferToBuffer()`, `copyBufferToTexture()`, `copyTextureToBuffer()`, `finish()`
  - `GPURenderPassEncoder`: `setPipeline()`, `setBindGroup()`, `setVertexBuffer()`, `setIndexBuffer()`, `draw()`, `drawIndexed()`, `end()`
  - `GPUComputePassEncoder`: `setPipeline()`, `setBindGroup()`, `dispatchWorkgroups()`, `end()`
  - `GPUQueue`: `submit(commandBuffers: GPUCommandBuffer[]): void`, `writeBuffer()`, `writeTexture()`

---

## 3. High-Performance Zero-Copy Implementation Plan

1. **Direct Memory Pointer Uploads for `bufferData` & `texImage2D`:**
   - In 3D engines, vertex buffers (Float32Array) and textures (Uint8Array) contain megabytes of data.
   - The Wasm Proxy forwards the raw memory pointer (`ptr`) and length (`len`) inside Wasm linear memory.
   - Host accesses `new Float32Array(wasmMemory.buffer, ptr, len / 4)` directly and uploads to the GPU without copying or JSON encoding.
2. **Handle Interception for WebGL Resources:**
   - Shaders, programs, textures, and buffers are represented in Wasm by integer handle proxies.
   - Calls like `gl.bindBuffer(gl.ARRAY_BUFFER, buffer)` pass the handle `buffer.__handle__` directly to the host OpenGL/WebGL state machine.
