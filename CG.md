# AetherControl: Computer Graphics (CG) Concepts & Implementation 🧬

This document outlines the core **Computer Graphics** (CG) principles used in the AetherControl AR engine, explaining how theoretical concepts like Shaders, Transformations, and Image Processing are practically applied.

---

## 🏗️ 1. Coordinate Systems & Spatial Transformations
In AR, the primary challenge is synchronizing different coordinate systems. We utilize **three distinct layers** of transformation:

- **Concept**: Normalized Device Coordinates (NDC) to World Space.
- **Implementation**: Hand landmarks from MediaPipe are provided in a normalized `0.0 to 1.0` range. We transform these into **Three.js World Coordinates** using a custom `landmarkToWorld` utility.
- **Aspect Ratio Calibration**: We calculate a `scaleX` and `scaleY` based on the browser's aspect ratio vs the video's aspect ratio to ensure the 3D points overlay perfectly on the webcam pixels (1:1 registration).

---

## 💠 2. Point Cloud Modeling & Primitive Rendering
Traditional 3D models use triangles (Mesh), but AetherControl uses a **Point Cloud** for a more "digital/ghost" aesthetic.

- **Concept**: Vertex Buffers and Point Primitives.
- **Implementation**: We define a `THREE.BufferGeometry` with a grid of **65,536 vertices** (256x256). 
- **Efficiency**: Instead of creating 65k individual objects, we use a single `THREE.Points` primitive, which allows the GPU to render all points in a single draw call, maintaining a high frame rate.

---

## 🎨 3. Programmable Shaders (GLSL)
The heart of the "X-Ray" effect lies in the **Graphics Pipeline** (Vertex and Fragment shaders).

### A. Vertex Displacement (Vertex Shader)
- **Concept**: Geometry extrusion based on Texture Luminance.
- **Implementation**: We sample the webcam's `VideoTexture` in the Vertex Shader. We calculate the **Luminance** of each pixel and use it to displace the point's **Z-position**.
  ```glsl
  float luminance = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
  pos.z += (luminance * 3.5); // 3D Extrusion
  ```
- **Result**: Brighter areas of your body (like the face) push forward in 3D, creating a volumetric "ghost" effect.

### B. Bio-Thermal Heat Mapping (Fragment Shader)
- **Concept**: Color Interpolation (Lerp) and Thermal Simulation.
- **Implementation**: We implement a **multi-chromatic color ramp**. Depending on the pixel brightness, we interpolate between Blue (Cold), Cyan, Green, Yellow, Orange, and White (Hot).
  ```glsl
  if (t < 0.2) return mix(blue, cyan, t * 5.0);
  // ... and so on for all 6 heat levels
  ```

---

## 🖼️ 4. Image Processing & Masking
Image processing is used to isolate the user from the background.

- **Concept**: Binary Alpha Masking (Chroma Keying logic).
- **Implementation**: We use **MediaPipe Selfie Segmentation** to generate a black/white mask. This is passed to the shader as a `uSegmentationTexture`. 
  - If a point's mask value is `< 0.05`, the shader executes a `discard;` command, effectively "deleting" the background points in real-time.

---

## 📽️ 5. Post-Processing Effects
We treat the final render as a 2D image and apply additional filters.

- **Concept**: Framebuffer Effects.
- **Implementation**: 
  - **Bloom**: Uses a bright-pass filter to isolate high-intensity pixels (like the thermal white) and blurs them to create a neon glow.
  - **Vignette**: Mathematically darkens the corners of the viewport to focus the viewer's attention on the center AR scanner.
  - **Scanlines**: A sine-wave function in the fragment shader simulates the CRT scanline effect of tactical HUDs.

---

## 🧬 Summary Table

| **CG Concept** | **Project Feature** | **Implementation Code** |
| :--- | :--- | :--- |
| **Rasterization** | Drawing points to screen | `THREE.Points` |
| **UV Mapping** | Projecting video onto points | `attributes-uv` buffer |
| **Texture Sampling** | Real-time webcam processing | `texture2D(uVideoTexture, uv)` |
| **Alpha Blending** | Transparency and Glow | `transparent: true`, `gl_FragColor.a` |
| **Z-Displacement** | 3D Depth Simulation | `pos.z += luminance` |
| **Clipping** | Hand-tracked rectangle | `vInside = (pos.x >= min && pos.x <= max)` |
| **Hierarchical Modeling** | Aether-Core Engine | `EngineModel.tsx` (Exploded view) |
| **Raycasting**| Object Selection | `HologramCanvas.tsx` (HandPointer) |

---

## 🛠️ 6. Holographic Manipulation & Hierarchical Animation
The **Aether-Core** mode demonstrates advanced interaction and model organization.

- **Concept**: Parent-Child Hierarchies and Local-to-World space transformations.
- **Implementation**:
  - The engine is built using a `THREE.Group` containing multiple `EnginePart` components.
  - **Exploded View**: We apply a translation vector to each child part relative to the group's origin. The distance is controlled by the `explodeFactor` (derived from hand distance).
  - **Interactivity**: We use a virtual **Raycaster** that originates from the user's index finger (Point gesture) to detect intersections with individual mesh components, enabling part-specific highlighting and telemetry.
