# 🏠 3D Room Designer

A desktop application for interactive 3D interior design, built with WebGL, TypeScript, and Tauri.

**Author:** Mateusz Adamczyk  
**Project:** Final Project - 3D Graphics Programming

![3D Room Designer](./screenshots/main-view.png)

## 🎯 Project Description

3D Room Designer is an interactive desktop application that allows users to design interior spaces in 3D. Users can add, move, rotate, and scale various furniture pieces within a virtual room, with real-time rendering including realistic lighting and shadows.

## ✨ Features

### Core Features
- **Interactive 3D Environment**: Full 3D room with floor and walls
- **Multiple Furniture Types**: Table, chair, bookshelf, sofa, and lamp
- **Object Manipulation**: Click to select, move, rotate, and scale furniture via GUI
- **Camera Controls**: Orbital camera with mouse drag to rotate and scroll to zoom

### Advanced Graphics Features
- **Phong Lighting Model**: Complete implementation with ambient, diffuse, and specular components
- **Shadow Mapping**: Real-time shadows using depth map technique
- **Texture Support**: Procedural textures for floor and walls
- **GLSL Shaders**: Custom vertex and fragment shaders for all rendering
- **Ray Casting**: Mouse picking for object selection

### User Interface
- **lil-gui Integration**: Real-time parameter adjustment
- **Scene Management**: Add/remove furniture dynamically
- **Transform Controls**: Position, rotation, and scale sliders
- **Lighting Controls**: Adjustable light direction and intensity
- **Visual Feedback**: Selected objects are highlighted

## 🛠 Technology Stack

- **Frontend**: TypeScript + Vue 3 + Vite
- **Graphics**: WebGL 2.0 with GLSL shaders
- **Desktop Framework**: Tauri (Rust)
- **Math Library**: gl-matrix
- **UI**: lil-gui
- **Build Tool**: Vite

## 📋 Requirements Met

### Minimum Requirements (Grade 3.0-3.5)
- ✅ Correct compilation and execution
- ✅ Scene contains multiple 3D objects (5 furniture types)
- ✅ User interaction (camera control, object manipulation, parameter changes)
- ✅ Textured objects (floor and walls)
- ✅ Phong lighting (ambient + diffuse + specular)

### Excellent Grade (5.0)
- ✅ GLSL shaders (vertex and fragment)
- ✅ Advanced effect: Shadow mapping with PCF (Percentage Closer Filtering)
- ✅ Polished visuals and stable performance
- ✅ Well-documented codebase

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Rust (latest stable version)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/room-designer-3d.git
   cd room-designer-3d/app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

The built application will be available in `src-tauri/target/release/`.

## 🎮 Controls

### Camera
- **Left Click + Drag**: Rotate camera around the scene
- **Mouse Wheel**: Zoom in/out

### Object Selection
- **Left Click** on furniture: Select object
- Selected objects are highlighted with a yellow tint

### GUI Controls
- **Scene Panel**: Add new furniture to the room
- **Lighting Panel**: Adjust light direction, intensity, and toggle shadows
- **Selected Object Panel** (appears when object is selected):
  - Position sliders (X, Y, Z)
  - Rotation control (0-360°)
  - Scale sliders (X, Y, Z)
  - Delete and Deselect buttons

## 📦 Furniture Types

1. **Table**: Rectangular table with four legs
2. **Chair**: Chair with seat, backrest, and four legs
3. **Bookshelf**: Multi-shelf storage unit
4. **Sofa**: Couch with armrests and cushioned seat
5. **Lamp**: Floor lamp with base, pole, and shade

All furniture is procedurally generated using primitive geometric shapes.

## 🏗 Architecture

### Project Structure
```
app/
├── src/
│   ├── utils/
│   │   ├── RoomScene.ts          # Main 3D scene manager
│   │   ├── FurnitureFactory.ts   # Procedural furniture generation
│   │   ├── TextureLoader.ts      # Texture loading and management
│   │   ├── ShadowMap.ts          # Shadow mapping implementation
│   │   ├── Raycaster.ts          # Mouse picking / ray casting
│   │   └── OrbitControls.ts      # Camera controls
│   ├── types/
│   │   └── FurnitureObject.ts    # Type definitions
│   ├── App.vue                    # Main application component
│   └── main.ts                    # Application entry point
├── src-tauri/                     # Tauri backend (Rust)
└── public/                        # Static assets
```

### Key Components

**RoomScene.ts**
- Manages WebGL context and rendering pipeline
- Implements two-pass rendering (shadow map + main pass)
- Handles furniture collection and rendering
- Provides public API for scene manipulation

**FurnitureFactory.ts**
- Creates procedural furniture models from primitives
- Generates WebGL buffers (VAOs, VBOs, IBOs)
- Returns structured furniture objects with parts

**ShadowMap.ts**
- Implements shadow mapping technique
- Creates depth framebuffer and texture
- Manages light-space matrices
- Provides shadow rendering pass

**Raycaster.ts**
- Converts screen coordinates to 3D rays
- Performs ray-AABB intersection tests
- Enables mouse picking of furniture

## 🎨 Graphics Techniques

### Phong Shading
Complete Phong reflection model with:
- Ambient light: Base illumination
- Diffuse light: Lambertian reflection based on surface normal
- Specular highlight: View-dependent reflection with shininess control

### Shadow Mapping
- **First Pass**: Render scene from light's perspective to depth texture (2048x2048)
- **Second Pass**: Render scene normally, sampling shadow map to determine shadows
- **PCF**: Percentage Closer Filtering for soft shadow edges
- **Bias**: Shadow acne prevention

### Procedural Textures
- Checkerboard pattern for floor (alternating light/dark tiles)
- Noise-based texture for walls (subtle variation)
- Generated at runtime, no external image files needed

## 📚 Libraries & Assets

### Open-Source Libraries
- [gl-matrix](https://glmatrix.net/) - High-performance matrix and vector operations (MIT License)
- [lil-gui](https://lil-gui.georgealways.com/) - Lightweight GUI library (MIT License)
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework (MIT License)
- [Tauri](https://tauri.app/) - Desktop application framework (MIT License)
- [Vite](https://vitejs.dev/) - Fast build tool (MIT License)

### Assets
- All 3D geometry is procedurally generated - no external models
- All textures are procedurally generated - no external images
- Icons from Tauri default template

## 🐛 Known Issues & Future Improvements

### Potential Enhancements
- Load external 3D models (.obj, .gltf)
- More furniture types and variations
- Save/load room designs
- Export room as image or 3D file
- Multi-light support
- Material editor
- Undo/redo functionality
- Snap-to-grid placement

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Project developed for 3D Graphics Programming course
- Procedural modeling techniques inspired by computer graphics literature
- Shadow mapping implementation based on LearnOpenGL tutorials

---

**Developed with ❤️ using WebGL, TypeScript, and Tauri**

