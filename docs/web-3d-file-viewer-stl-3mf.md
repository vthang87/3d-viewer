# Web 3D File Viewer — STL / 3MF

> **Trạng thái MVP:** đã triển khai.  
> Live: [https://3d-viewer.vthang.top](https://3d-viewer.vthang.top) · Portainer stack `3d-viewer` (hp-pc) · image `ghcr.io/vthang87/3d-viewer:latest`  
> Chi tiết chạy / deploy: xem [README](../README.md).

## 1. Mục tiêu

Xây dựng một web app cho phép người dùng mở và xem trực tiếp các file 3D phổ biến như:

- `.stl`
- `.3mf`

Ứng dụng ưu tiên xử lý hoàn toàn trên trình duyệt, không cần upload file lên server nếu chỉ sử dụng chức năng xem file.

Mục tiêu chính:

- Mở file 3D nhanh.
- Drag & drop file trực tiếp vào trình duyệt.
- Xoay, zoom, pan model.
- Hiển thị thông tin cơ bản của model.
- Hỗ trợ STL và 3MF.
- Có thể deploy đơn giản trên Vercel hoặc Cloudflare Pages.
- Thiết kế nền tảng để mở rộng thành công cụ kiểm tra model 3D.

---

## 2. Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### 3D Engine

- Three.js
- React Three Fiber
- @react-three/drei

### File Loaders

- STLLoader
- ThreeMFLoader

### Optional Libraries

- Zustand — quản lý state viewer.
- react-dropzone — drag & drop file.
- lucide-react — icon.
- JSZip — xử lý archive nếu cần custom parser cho 3MF.

---

## 3. Kiến trúc tổng thể

```text
User
  |
  | Open / Drag & Drop File
  v
Browser
  |
  +--> File Validation
  |
  +--> Detect Format
  |      |
  |      +--> STLLoader
  |      |
  |      +--> ThreeMFLoader
  |
  +--> Normalize Model
  |
  +--> Calculate Bounding Box
  |
  +--> Center Model
  |
  +--> Fit Camera
  |
  +--> Render with Three.js
```

Toàn bộ quá trình có thể chạy client-side.

Không cần backend cho MVP.

---

## 4. Layout đề xuất

```text
┌──────────────────────────────────────────────────────────────┐
│  3D File Viewer                    Open File   Reset   ⚙     │
├──────────────────┬───────────────────────────────────────────┤
│                  │                                           │
│ MODEL INFO       │                                           │
│                  │                                           │
│ filename.stl     │               3D VIEWPORT                 │
│ STL              │                                           │
│                  │             Model + Grid                  │
│ 120 × 80 × 32 mm │                                           │
│                  │                                           │
│ 85K triangles    │                                           │
│                  │                                           │
│ Meshes: 1        │                                           │
│                  │                                           │
├──────────────────┴───────────────────────────────────────────┤
│ Solid | Wireframe | Grid | Axes | Projection | Screenshot   │
└──────────────────────────────────────────────────────────────┘
```

---

# 5. Các khu vực giao diện

## 5.1 Header

Chứa:

- Logo / tên app.
- Open File.
- Reset Camera.
- Fullscreen.
- Settings.

Ví dụ:

```text
3D File Viewer

[ Open File ] [ Reset ] [ Fullscreen ] [ Settings ]
```

---

## 5.2 File Drop Zone

Khi chưa mở model:

```text
Drop STL or 3MF file here

or

[ Choose File ]

Supported formats:
STL
3MF
```

Có thể hỗ trợ:

- Drag & drop.
- File picker.
- Kéo file trực tiếp từ Finder / Explorer.

---

## 5.3 Sidebar — Model Information

Hiển thị:

### File Information

- File name.
- File format.
- File size.

Ví dụ:

```text
File

Name:
gearbox.stl

Format:
STL

Size:
8.4 MB
```

---

### Dimensions

Hiển thị bounding box:

```text
Dimensions

X: 120.00 mm
Y: 80.00 mm
Z: 32.00 mm
```

Hoặc:

```text
120 × 80 × 32 mm
```

---

### Geometry

```text
Geometry

Meshes: 1

Triangles:
85,320

Vertices:
255,960
```

Với 3MF có thể có nhiều object:

```text
Objects: 4
Meshes: 7
```

---

## 5.4 3D Viewport

Viewport sử dụng:

```text
React Three Fiber
+
Three.js
```

Các thành phần:

```text
Canvas
 ├── Camera
 ├── OrbitControls
 ├── AmbientLight
 ├── DirectionalLight
 ├── Model
 ├── Grid
 └── AxesHelper
```

---

# 6. Các chức năng MVP

## 6.1 Open STL

Hỗ trợ:

```text
ASCII STL
Binary STL
```

Sử dụng:

```text
STLLoader
```

Flow:

```text
File
  ↓
ArrayBuffer
  ↓
STLLoader.parse()
  ↓
BufferGeometry
  ↓
Mesh
  ↓
Scene
```

---

## 6.2 Open 3MF

Sử dụng:

```text
ThreeMFLoader
```

3MF có thể chứa:

- Multiple objects.
- Multiple meshes.
- Transform.
- Materials.
- Colors.
- Metadata.

Viewer nên giữ nguyên hierarchy nếu có thể.

Flow:

```text
3MF File
   ↓
ArrayBuffer
   ↓
ThreeMFLoader
   ↓
Object3D / Group
   ↓
Scene
```

---

## 6.3 Drag & Drop

Hỗ trợ:

```text
.stl
.3mf
```

Validate:

- Extension.
- MIME type nếu có.
- File size.

Ví dụ giới hạn mặc định:

```text
Max file size: 200 MB
```

Có thể tăng nếu máy người dùng đủ RAM.

---

# 7. Camera Controls

Sử dụng:

```text
OrbitControls
```

Các thao tác:

### Rotate

```text
Left Mouse Drag
```

### Pan

```text
Right Mouse Drag
```

hoặc:

```text
Shift + Drag
```

### Zoom

```text
Mouse Wheel
```

### Reset

Camera trở về góc mặc định.

---

# 8. Auto Center Model

Sau khi load model:

```text
Model
  ↓
Calculate BoundingBox
  ↓
Get Center
  ↓
Translate Model
  ↓
Center at 0,0,0
```

Pseudo logic:

```ts
const box = new THREE.Box3().setFromObject(model)

const center = box.getCenter(new THREE.Vector3())

model.position.sub(center)
```

---

# 9. Fit Camera

Tự động đặt camera sao cho model nằm vừa viewport.

Flow:

```text
Bounding Box
   ↓
Get Maximum Dimension
   ↓
Calculate Camera Distance
   ↓
Update Camera
   ↓
Update OrbitControls Target
```

Ví dụ:

```ts
const size = box.getSize(new THREE.Vector3())

const maxDim = Math.max(
  size.x,
  size.y,
  size.z
)
```

Sau đó tính khoảng cách camera dựa trên FOV.

---

# 10. Grid

Hiển thị grid giúp quan sát kích thước model.

Ví dụ:

```text
Major Grid: 10 mm

Minor Grid:
1 mm
```

Có option:

```text
Grid ON / OFF
```

---

# 11. Axis

Hiển thị:

```text
X = Red
Y = Green
Z = Blue
```

Option:

```text
Axes ON / OFF
```

Có thể dùng:

```text
AxesHelper
```

---

# 12. Render Modes

## Solid

Render mặc định.

```text
Solid
```

---

## Wireframe

```text
Wireframe
```

Dùng:

```ts
material.wireframe = true
```

---

## Solid + Wireframe

Optional:

```text
Solid
+
Wire Overlay
```

Hữu ích để kiểm tra topology.

---

# 13. Material

Với STL thường không có material.

Dùng material mặc định:

```text
MeshStandardMaterial
```

Các tùy chỉnh:

```text
Color
Roughness
Metalness
Opacity
```

Ví dụ:

```text
Color: #d1d5db

Roughness: 0.7

Metalness: 0.1
```

---

# 14. Lighting

Setup đề xuất:

```text
Ambient Light

+

Directional Light

+

Optional Environment Light
```

Ví dụ:

```text
AmbientLight
Intensity 0.6

DirectionalLight
Intensity 1.5
```

Optional:

```text
Environment HDRI
```

---

# 15. Background

Cho phép chọn:

```text
Dark

Light

Transparent
```

Default đề xuất:

```text
#111827
```

---

# 16. Viewer State

Dùng Zustand.

Ví dụ:

```ts
ViewerStore
```

State:

```text
currentFile

fileType

model

dimensions

triangleCount

meshCount

renderMode

gridVisible

axesVisible

background

modelColor
```

---

# 17. Component Structure

```text
src/

app/
  page.tsx

components/

  viewer/

    Viewer.tsx

    Scene.tsx

    ModelRenderer.tsx

    CameraController.tsx

    ViewerGrid.tsx

    ViewerAxes.tsx

  file/

    FileDropzone.tsx

    FilePicker.tsx

    FileInfo.tsx

  sidebar/

    ModelInfo.tsx

    GeometryInfo.tsx

    DimensionsInfo.tsx

  toolbar/

    ViewerToolbar.tsx

    RenderMode.tsx

    CameraControls.tsx

lib/

  loaders/

    stl-loader.ts

    threemf-loader.ts

  geometry/

    bounding-box.ts

    geometry-info.ts

    triangle-count.ts

  camera/

    fit-camera.ts

store/

  viewer-store.ts

types/

  viewer.ts
```

---

# 18. File Loader Architecture

Tạo abstraction:

```ts
loadModel(file)
```

Logic:

```text
Detect Extension
      |
      +---- STL
      |
      +---- 3MF
```

Pseudo:

```ts
switch (extension) {

  case "stl":

    return loadSTL(file)

  case "3mf":

    return load3MF(file)

}
```

---

# 19. Normalize Model

Sau khi load:

```text
Loaded Model
   ↓
Traverse Mesh
   ↓
Normalize Materials
   ↓
Compute BoundingBox
   ↓
Center Model
   ↓
Compute Geometry Stats
   ↓
Fit Camera
```

---

# 20. Geometry Statistics

Cần tính:

```text
Meshes

Vertices

Triangles

Bounding Box

Dimensions
```

Triangle count:

```text
indexed geometry

index.count / 3
```

hoặc:

```text
non-indexed

position.count / 3
```

---

# 21. Units

STL không lưu unit chuẩn rõ ràng.

Viewer mặc định:

```text
mm
```

UI nên cho đổi:

```text
mm

cm

inch
```

Default:

```text
millimeter
```

Có thể thêm warning:

```text
STL files do not contain unit metadata.
Dimensions are interpreted as millimeters.
```

---

# 22. 3MF Unit Handling

3MF hỗ trợ unit trong metadata/XML.

Có thể có:

```text
micron

millimeter

centimeter

inch

foot

meter
```

Viewer nên convert về:

```text
millimeter
```

để hiển thị thống nhất.

---

# 23. Large File Handling

File STL có thể rất lớn.

Ví dụ:

```text
100 MB

500 MB

1 GB
```

Các biện pháp:

### Loading Indicator

```text
Loading Model...

Parsing Geometry...
```

### Disable UI During Parse

### Web Worker

Roadmap nên chuyển parsing sang:

```text
Web Worker
```

để tránh block UI.

---

# 24. Memory Management

Khi user mở file mới:

```text
Dispose Geometry

Dispose Material

Dispose Texture
```

Ví dụ:

```ts
geometry.dispose()

material.dispose()
```

Để tránh memory leak WebGL.

---

# 25. Responsive

Desktop là ưu tiên.

Layout:

```text
Desktop

Sidebar | Viewport
```

Tablet:

```text
Collapsible Sidebar

Viewport
```

Mobile:

```text
Viewport

Bottom Sheet
```

Mobile chỉ nên hỗ trợ:

```text
View

Rotate

Zoom

Basic Info
```

---

# 26. Toolbar

Bottom toolbar:

```text
Solid

Wireframe

Grid

Axes

Projection

Screenshot

Fullscreen
```

Ví dụ:

```text
[ Solid ]

[ Wireframe ]

[ Grid ✓ ]

[ Axes ✓ ]

[ Perspective ]

[ Screenshot ]
```

---

# 27. Projection

Hỗ trợ:

```text
Perspective Camera

Orthographic Camera
```

Perspective:

```text
Normal 3D viewing
```

Orthographic:

```text
Engineering inspection
```

---

# 28. Standard Views

Có thể thêm:

```text
Front

Back

Left

Right

Top

Bottom

Isometric
```

UI:

```text
Cube View Controller
```

Giống CAD viewer.

---

# 29. Screenshot

Cho phép:

```text
Export PNG
```

Flow:

```text
WebGL Canvas

↓

toDataURL()

↓

Download PNG
```

Có thể thêm:

```text
Transparent background
```

---

# 30. Fullscreen

Button:

```text
Fullscreen
```

Sử dụng:

```text
Fullscreen API
```

Viewport chiếm toàn màn hình.

---

# 31. Error Handling

Các lỗi cần xử lý:

```text
Unsupported File

Invalid STL

Invalid 3MF

File Too Large

Out of Memory

WebGL Not Supported
```

Ví dụ:

```text
Unable to load this file.

The model may be corrupted or unsupported.
```

---

# 32. Security

Vì xử lý local:

```text
File stays in browser
```

Không upload server.

Có thể hiển thị:

```text
Your files never leave your device.
```

Đây là điểm tốt để làm privacy feature.

---

# 33. Deployment

MVP có thể deploy:

```text
Vercel
```

hoặc:

```text
Cloudflare Pages
```

Không cần:

```text
Database

Backend

Object Storage
```

---

# 34. MVP Scope

Version:

```text
v0.1
```

Bao gồm:

```text
Open STL

Open 3MF

Drag & Drop

3D Viewer

Orbit Controls

Auto Center

Fit Camera

Bounding Box

Dimensions

Triangle Count

Mesh Count

Grid

Axes

Solid Mode

Wireframe Mode

Reset Camera

Fullscreen
```

---

# 35. Version 0.2

Thêm:

```text
Model Color

Background Color

Orthographic Camera

Standard Views

Screenshot

Object Tree for 3MF

Show / Hide Mesh

Unit Selector
```

---

# 36. Version 0.3

Inspection tools:

```text
Measure Distance

Measure Angle

Measure Bounding Box

Cross Section

Clipping Plane

Exploded View
```

---

# 37. Measurement Tool

Cho phép click:

```text
Point A

Point B
```

Hiển thị:

```text
Distance:

42.36 mm
```

Có thể dùng:

```text
Raycaster
```

để lấy tọa độ trên mesh.

---

# 38. Section / Clipping Plane

Dùng:

```text
Three.js ClippingPlane
```

Cho phép cắt:

```text
X

Y

Z
```

Ví dụ:

```text
Section Z

Slider:

0 --------●-------- 100
```

Hữu ích để kiểm tra cấu trúc bên trong.

---

# 39. 3MF Object Tree

3MF có thể chứa nhiều component.

Sidebar:

```text
Objects

▼ Assembly

   ☑ Body

   ☑ Cover

   ☑ Screw

   ☑ Gear
```

Cho phép:

```text
Show

Hide

Select

Isolate
```

---

# 40. Exploded View

Cho 3MF assembly.

```text
Explode

0 --------●-------- 100
```

Tách các component theo khoảng cách.

---

# 41. File Formats Mở Rộng

Roadmap:

```text
OBJ

GLB

GLTF

PLY

STEP
```

Lưu ý:

STEP không được Three.js hỗ trợ trực tiếp.

Cần convert:

```text
STEP

↓

OpenCascade WASM

↓

Mesh

↓

Three.js
```

Có thể nghiên cứu:

```text
OpenCascade.js
```

---

# 42. PWA

Có thể biến viewer thành:

```text
Progressive Web App
```

Người dùng có thể:

```text
Install App

Open STL Offline

Open 3MF Offline
```

Không cần server.

---

# 43. Optional Recent Files

Dùng:

```text
IndexedDB
```

Không upload cloud.

Lưu:

```text
Recent Models

Viewer Settings
```

Không nên mặc định lưu file lớn nếu chưa có consent.

---

# 44. UI Style

Đề xuất phong cách:

```text
CAD Viewer

Minimal

Dark Mode

Technical
```

Tham khảo tinh thần UI:

```text
Fusion 360

Bambu Studio

PrusaSlicer

Onshape Viewer
```

Không cần clone.

Chỉ lấy cảm hứng:

```text
Clean

Technical

High Contrast

Viewport First
```

---

# 45. Color System

Dark:

```text
Background

#0B0F19
```

Panel:

```text
#111827
```

Border:

```text
#1F2937
```

Text:

```text
#F9FAFB
```

Secondary:

```text
#9CA3AF
```

Accent:

```text
#3B82F6
```

---

# 46. UX Flow

```text
Open Website

↓

Drop STL / 3MF

↓

Loading Model

↓

Auto Center

↓

Auto Fit Camera

↓

Display Model Info

↓

User Inspect Model
```

---

# 47. Performance Goals

Mục tiêu ban đầu:

```text
10 MB STL

Instant / near instant
```

```text
50–100 MB

Few seconds depending on hardware
```

```text
200+ MB

Supported with warning
```

Đối với model rất lớn:

```text
Web Worker

Geometry Optimization

Progressive Loading
```

sẽ được triển khai ở version sau.

---

# 48. Không cần Backend ở MVP

Architecture:

```text
Next.js Static App

↓

Browser File API

↓

Three.js

↓

WebGL
```

Không cần:

```text
API Server

Database

Authentication

Storage
```

Điều này giúp:

```text
Deploy đơn giản

Chi phí thấp

Privacy tốt

Load file nhanh
```

---

# 49. Future SaaS Mode

Nếu sau này muốn biến thành platform:

```text
User Account

Upload Model

Cloud Storage

Share Link

Comments

Annotations

Team Workspace
```

Stack có thể thêm:

```text
Payload CMS

PostgreSQL

Cloudflare R2

Next.js API
```

Flow:

```text
User

↓

Upload 3D File

↓

R2

↓

Database Metadata

↓

Viewer

↓

Share Link
```

---

# 50. Roadmap Tổng Thể

## Phase 1 — Viewer Core

```text
STL

3MF

Viewer

Camera

Grid

Model Info
```

---

## Phase 2 — Inspection

```text
Measurement

Orthographic

Standard Views

Screenshot

Object Tree
```

---

## Phase 3 — Advanced 3D

```text
Section View

Clipping Plane

Exploded View

Annotations
```

---

## Phase 4 — Platform

```text
Accounts

Storage

Share Models

Comments

Teams
```

---

# 51. Recommended Initial Project Name

Tên đơn giản:

```text
3D Viewer
```

Hoặc:

```text
MeshView
```

```text
ModelView
```

```text
STLView
```

```text
PrintView
```

Nếu hướng tới cộng đồng 3D printing:

```text
PrintView
```

là tên dễ nhớ và phù hợp với STL / 3MF.

---

# 52. Kết luận

MVP nên tập trung vào một ứng dụng:

```text
Fast

Client-side

Privacy-first

No Upload

STL + 3MF
```

Stack chính:

```text
Next.js

React

TypeScript

React Three Fiber

Three.js

shadcn/ui
```

Kiến trúc này đủ nhẹ để triển khai nhanh, nhưng vẫn có khả năng mở rộng thành một công cụ 3D inspection hoàn chỉnh với measurement, section view, exploded view và cloud sharing trong các phase sau.
