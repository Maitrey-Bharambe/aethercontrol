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

---

## 📱 7. Page-by-Page CG Analysis

### A. Hologram Page (`/hologram` & Home)
- **Hierarchical Modeling**: The engine is built as a nested tree of 3D objects. Rotating the parent `THREE.Group` affects all children, while children can independently "explode" outwards.
- **Trigonometric Proceduralism**: Cooling fins are placed using `sin()` and `cos()` to calculate precise circular coordinates.
- **PBR Materials**: Use of Metalness and Roughness maps to simulate light interaction with metallic surfaces.

### B. Air Draw Page (`/air-draw`)
- **Raster Graphics**: Direct pixel manipulation via the HTML5 Canvas 2D API.
- **Bézier Path Smoothing**: Uses `quadraticCurveTo` to interpolate between sampled hand coordinates, preventing "jagged" lines at high speeds.
- **Composite Blending**: Employs `source-over` and `shadowBlur` to create a neon glow effect that simulates emissive light.

### C. X-Ray Page (`/x-ray`)
- **Vertex Displacement**: Treats pixel luminance as depth data to extrude the 2D camera feed into a 3D volumetric "ghost" cloud.
- **Dynamic Color Ramps**: Uses GLSL `mix()` functions to map grayscale values to a multi-chromatic bio-thermal palette.
- **Fragment Selection**: background points are removed in real-time using the `discard` command based on a segmentation alpha-mask.

### D. Puzzle Page (`/puzzle`)
- **Texture Atlasing**: Slices a single image into a grid of independent graphical tiles.
- **CSS UV Mapping**: Uses `background-position` percentages to map specific image regions to rectangular primitives.
- **Spatial Collision Detection**: Converts hand landmarks into normalized grid coordinates for piece selection and swapping.

### E. Global Particle Dynamics (`CanvasParticleSystem.tsx`)
- **Interactive Force Fields**: Implements attraction (gravity) and repulsion (electromagnetic simulation) logic based on hand gestures like GRAB and SPREAD.

---

## 🎓 8. Viva Quick Reference (4 Major Pillars)

If asked about the **Major Concepts** of this project, refer to this mapping:

### 1. X-Ray Scanner (The Shader Pillar)
*   **Major Concept**: **3D Volumetric Extrusion via Vertex Displacement.**
*   **The "Why"**: Traditional monitors are 2D. We use a **Vertex Shader** to calculate the luminance (brightness) of each camera pixel and push that pixel's coordinate forward in the Z-axis.
*   **Viva Answer**: "We map the intensity of light to physical depth, transforming a flat webcam feed into a volumetric 3D point cloud in real-time."

### 2. Aether-Core Hologram (The Modeling Pillar)
*   **Major Concept**: **Hierarchical Modeling & Local Transformations.**
*   **The "Why"**: Complex machines are built as a tree. By using a **Scene Graph (Parent-Child hierarchy)**, we can rotate the whole engine while allowing individual parts to "explode" along their own local normal vectors.
*   **Viva Answer**: "Each part is a child of a central core. We calculate a translation vector for every segment so they can move relative to the center based on hand distance."

### 3. Neon Air Draw (The Rasterization Pillar)
*   **Major Concept**: **Digital Differential Analysis (DDA) & Bézier Smoothing.**
*   **The "Why"**: Hand tracking is noisy. We use **Quadratic Bézier Curves** to interpolate between sampled points, ensuring the rasterized lines on the canvas look smooth and professional.
*   **Viva Answer**: "We translate raw landmark coordinates into a 2D raster path. To prevent jagged lines, we use mathematical smoothing to bridge the gaps between tracked frames."

### 4. Interactive Puzzle (The Texture Pillar)
*   **Major Concept**: **UV Mapping & Spatial Quantization.**
*   **The "Why"**: To slice an image, we don't cut the file; we change the **UV Coordinates** (Background Position) of each tile.
*   **Viva Answer**: "We use a single texture atlas (the photo) and map specific sub-regions to grid tiles. We then use spatial quantization to snap hand-tracked coordinates into discrete grid slots."
