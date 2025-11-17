<template>
  <div class="app">
    <canvas ref="canvas" class="webgl-canvas"></canvas>
    <div class="info">
      <h1>3D Room Designer</h1>
      <p><strong>Mouse:</strong> Drag to rotate | Scroll to zoom</p>
      <p><strong>WASD:</strong> Move camera | <strong>Q/E:</strong> Fly Up/Down</p>
      <p><strong>Click:</strong> Select objects | Use GUI to edit</p>
      <p :class="['mode-indicator', controlMode]">
        <strong>Mode:</strong> {{ controlMode === 'camera' ? '📷 Camera' : '🎯 Transform' }} 
        <span class="hint">(Press T to toggle)</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RoomScene, OrbitControls } from './utils';
import type { ControlMode } from './utils/OrbitControls';
import { SceneObject } from './types/FurnitureObject';
import { ALL_TEXTURES, TEXTURE_CATEGORIES } from './config/textures';
import GUI from 'lil-gui';
import * as THREE from 'three';

const canvas = ref<HTMLCanvasElement | null>(null);
const controlMode = ref<ControlMode>('camera');

let scene: RoomScene | null = null;
let controls: OrbitControls | null = null;
let gui: GUI | null = null;
let animationId: number | null = null;

// Transform mode variables
let isDragging = false;
let dragPlane: THREE.Plane | null = null;
let dragOffset = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let mousePosition = new THREE.Vector2();

// GUI folders
let selectedObjectFolder: GUI | null = null;

onMounted(() => {
  if (!canvas.value) return;

  // Resize canvas to window
  const resizeCanvas = () => {
    if (!canvas.value) return;
    canvas.value.width = window.innerWidth;
    canvas.value.height = window.innerHeight;
    scene?.updateAspect();
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Initialize scene
  scene = new RoomScene(canvas.value);

  // Add some initial furniture
  const table = scene.addFurniture('table');
  table.group.position.set(0, 0, -2);

  const chair1 = scene.addFurniture('chair');
  chair1.group.position.set(-1.5, 0, -2);
  chair1.group.rotation.y = Math.PI / 4;

  const chair2 = scene.addFurniture('chair');
  chair2.group.position.set(1.5, 0, -2);
  chair2.group.rotation.y = -Math.PI / 4;

  const bookshelf = scene.addFurniture('bookshelf');
  bookshelf.group.position.set(-8, 0, 0);

  const sofa = scene.addFurniture('sofa');
  sofa.group.position.set(0, 0, 6);
  sofa.group.rotation.y = Math.PI;

  // Initialize controls
  controls = new OrbitControls(
    canvas.value,
    scene.getCamera(),
    () => {
      // Controls will update camera automatically
    },
    (mode: ControlMode) => {
      controlMode.value = mode;
      // Update cursor style
      if (canvas.value) {
        canvas.value.style.cursor = mode === 'camera' ? 'grab' : 'crosshair';
      }
    }
  );

  // Setup GUI
  setupGUI();

  // Mouse handlers for both modes
  canvas.value.addEventListener('mousedown', (e) => {
    if (!scene || !controls) return;
    
    if (controls.getMode() === 'transform') {
      // Transform mode - start dragging
      const selected = scene.getSelectedObject();
      if (selected && selected.type === 'furniture' && selected.furnitureRef) {
        isDragging = true;
        
        const rect = canvas.value!.getBoundingClientRect();
        mousePosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mousePosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mousePosition, scene.getCamera());
        
        // Create a plane at the object's Y position
        const objectY = selected.furnitureRef.group.position.y;
        dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -objectY);
        
        // Calculate offset from object position to intersection point
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersection);
        dragOffset.copy(selected.furnitureRef.group.position).sub(intersection);
        
        canvas.value!.style.cursor = 'grabbing';
      }
    } else {
      // Camera mode - select object on click
      const rect = canvas.value!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const selected = scene.selectObject(x, y);
      updateSelectedObjectGUI(selected);
    }
  });

  canvas.value.addEventListener('mousemove', (e) => {
    if (!scene || !controls || !isDragging || controls.getMode() !== 'transform') return;
    
    const selected = scene.getSelectedObject();
    if (!selected || !selected.furnitureRef || !dragPlane) return;
    
    const rect = canvas.value!.getBoundingClientRect();
    mousePosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mousePosition, scene.getCamera());
    
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      // Apply offset and update position
      intersection.add(dragOffset);
      
      // Clamp to room bounds
      intersection.x = Math.max(-9, Math.min(9, intersection.x));
      intersection.z = Math.max(-9, Math.min(9, intersection.z));
      
      selected.furnitureRef.group.position.x = intersection.x;
      selected.furnitureRef.group.position.z = intersection.z;
      
      // Update GUI if it's showing position controls
      if (selectedObjectFolder) {
        updateSelectedObjectGUI(selected);
      }
    }
  });

  canvas.value.addEventListener('mouseup', () => {
    if (isDragging && canvas.value) {
      isDragging = false;
      canvas.value.style.cursor = controlMode.value === 'camera' ? 'grab' : 'crosshair';
    }
  });

  // Render loop
  const render = () => {
    // Update controls (handles WASD movement)
    controls?.update();

    scene?.render();
    animationId = requestAnimationFrame(render);
  };

  render();

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('resize', resizeCanvas);
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    controls?.dispose();
    gui?.destroy();
    scene?.dispose();
  });
});

function setupGUI() {
  if (!scene || !controls) return;

  gui = new GUI();
  gui.title('3D Room Designer');

  // Control mode
  const controlSettings = {
    mode: controlMode.value,
    toggleMode: () => {
      controls?.toggleMode();
      controlSettings.mode = controls?.getMode() || 'camera';
    }
  };
  
  const controlFolder = gui.addFolder('Controls');
  controlFolder.add(controlSettings, 'mode', ['camera', 'transform']).name('🎮 Mode').onChange((value: string) => {
    controls?.setMode(value as ControlMode);
    controlMode.value = value as ControlMode;
  });
  controlFolder.add(controlSettings, 'toggleMode').name('🔄 Toggle Mode (T)');
  controlFolder.open();

  // Scene controls
  const sceneFolder = gui.addFolder('Scene');
  
  const addFurnitureSettings = {
    type: 'table',
    add: () => {
      if (!scene) return;
      const furniture = scene.addFurniture(addFurnitureSettings.type as any);
      // Position randomly within room bounds
      furniture.group.position.set(
        (Math.random() - 0.5) * 8,
        0,
        (Math.random() - 0.5) * 8
      );
      furniture.group.rotation.y = Math.random() * Math.PI * 2;
      console.log(`Added ${addFurnitureSettings.type}`);
    }
  };

  sceneFolder.add(addFurnitureSettings, 'type', ['table', 'chair', 'bookshelf', 'sofa', 'lamp']).name('Furniture Type');
  sceneFolder.add(addFurnitureSettings, 'add').name('➕ Add Furniture');
  sceneFolder.open();

  // Textures controls
  const texturesFolder = gui.addFolder('Textures');
  
  // Create texture options for dropdown
  const textureOptions: { [key: string]: string } = {};
  ALL_TEXTURES.forEach(tex => {
    const category = TEXTURE_CATEGORIES[tex.category];
    const displayName = `${category} → ${tex.name}`;
    textureOptions[displayName] = tex.url;
  });
  
  const textureSettings = {
    info: 'Select object first, then choose texture',
    selectedTexture: Object.keys(textureOptions)[0],
    applyTexture: () => {
      if (!scene) return;
      const selected = scene.getSelectedObject();
      if (!selected) {
        alert('⚠️ Please select an object first!\n\nClick on:\n• Floor\n• Walls\n• Any furniture piece');
        return;
      }
      const url = textureOptions[textureSettings.selectedTexture];
      console.log(`Applying texture: ${textureSettings.selectedTexture}`);
      scene.loadTextureToSelected(url).then(success => {
        if (success) {
          console.log(`✅ Texture applied to ${selected.name}!`);
        } else {
          alert(`❌ Failed to load texture\n\nTry selecting a procedural texture instead.`);
        }
      });
    },
    customURL: '',
    applyCustom: () => {
      if (!scene) return;
      const selected = scene.getSelectedObject();
      if (!selected) {
        alert('⚠️ Please select an object first!\n\nClick on:\n• Floor\n• Walls\n• Any furniture piece');
        return;
      }
      const url = textureSettings.customURL.trim();
      if (!url) {
        alert('Please enter a texture URL');
        return;
      }
      console.log(`Loading custom texture: ${url}`);
      scene.loadTextureToSelected(url).then(success => {
        if (success) {
          alert(`✅ Custom texture loaded to ${selected.name}!`);
        } else {
          alert(`❌ Failed to load texture from:\n${url}\n\nPossible issues:\n• CORS restrictions\n• Invalid URL\n• Image not found\n\nTry using procedural textures instead!`);
        }
      });
    }
  };

  texturesFolder.add(textureSettings, 'info').name('ℹ️ Info').disable();
  texturesFolder.add(textureSettings, 'selectedTexture', Object.keys(textureOptions)).name('🎨 Texture');
  texturesFolder.add(textureSettings, 'applyTexture').name('✨ Apply Selected Texture');
  
  // Custom URL section
  const customFolder = texturesFolder.addFolder('Custom URL (Advanced)');
  customFolder.add(textureSettings, 'customURL').name('🔗 URL');
  customFolder.add(textureSettings, 'applyCustom').name('📥 Load Custom URL');

  // Lighting controls
  const lightingFolder = gui.addFolder('Lighting');
  
  const lightSettings = {
    directionX: -0.5,
    directionY: -1.0,
    directionZ: -0.5,
    intensity: 1.0,
    shadows: true
  };

  lightingFolder.add(lightSettings, 'directionX', -1, 1, 0.1).name('Light Dir X').onChange((value: number) => {
    scene?.setLightDirection(value, lightSettings.directionY, lightSettings.directionZ);
  });
  lightingFolder.add(lightSettings, 'directionY', -1, 1, 0.1).name('Light Dir Y').onChange((value: number) => {
    scene?.setLightDirection(lightSettings.directionX, value, lightSettings.directionZ);
  });
  lightingFolder.add(lightSettings, 'directionZ', -1, 1, 0.1).name('Light Dir Z').onChange((value: number) => {
    scene?.setLightDirection(lightSettings.directionX, lightSettings.directionY, value);
  });
  lightingFolder.add(lightSettings, 'intensity', 0, 2, 0.1).name('Intensity').onChange((value: number) => {
    scene?.setLightIntensity(value);
  });
  lightingFolder.add(lightSettings, 'shadows').name('Shadows').onChange((value: boolean) => {
    if (scene) scene.shadowsEnabled = value;
  });

  // Selected object folder (created dynamically)
}

function updateSelectedObjectGUI(selected: SceneObject | null) {
  // Remove existing folder
  if (selectedObjectFolder) {
    selectedObjectFolder.destroy();
    selectedObjectFolder = null;
  }

  if (!selected || !gui || !scene) return;

  // Create new folder for selected object
  selectedObjectFolder = gui.addFolder(`Selected: ${selected.name}`);

  // If it's furniture, show transform controls
  if (selected.type === 'furniture' && selected.furnitureRef) {
    const furniture = selected.furnitureRef;
    
    const settings = {
      posX: furniture.group.position.x,
      posY: furniture.group.position.y,
      posZ: furniture.group.position.z,
      rotation: furniture.group.rotation.y * (180 / Math.PI),
      scaleX: furniture.group.scale.x,
      scaleY: furniture.group.scale.y,
      scaleZ: furniture.group.scale.z,
      delete: () => {
        if (!scene || !furniture) return;
        scene.removeFurniture(furniture);
        scene.clearSelection();
        updateSelectedObjectGUI(null);
      },
      deselect: () => {
        scene?.clearSelection();
        updateSelectedObjectGUI(null);
      }
    };

    // Position controls
    const posFolder = selectedObjectFolder.addFolder('Position');
    posFolder.add(settings, 'posX', -9, 9, 0.1).name('X').onChange((value: number) => {
      furniture.group.position.x = value;
    });
    posFolder.add(settings, 'posY', 0, 4, 0.1).name('Y').onChange((value: number) => {
      furniture.group.position.y = value;
    });
    posFolder.add(settings, 'posZ', -9, 9, 0.1).name('Z').onChange((value: number) => {
      furniture.group.position.z = value;
    });
    posFolder.open();

    // Rotation control
    selectedObjectFolder.add(settings, 'rotation', 0, 360, 1).name('Rotation (°)').onChange((value: number) => {
      furniture.group.rotation.y = value * (Math.PI / 180);
    });

    // Scale controls
    const scaleFolder = selectedObjectFolder.addFolder('Scale');
    scaleFolder.add(settings, 'scaleX', 0.5, 3, 0.1).name('X').onChange((value: number) => {
      furniture.group.scale.x = value;
    });
    scaleFolder.add(settings, 'scaleY', 0.5, 3, 0.1).name('Y').onChange((value: number) => {
      furniture.group.scale.y = value;
    });
    scaleFolder.add(settings, 'scaleZ', 0.5, 3, 0.1).name('Z').onChange((value: number) => {
      furniture.group.scale.z = value;
    });

    // Action buttons
    selectedObjectFolder.add(settings, 'deselect').name('↩ Deselect');
    selectedObjectFolder.add(settings, 'delete').name('🗑 Delete');
  } else {
    // For floor and walls, just show info and deselect
    const settings = {
      type: selected.type,
      deselect: () => {
        scene?.clearSelection();
        updateSelectedObjectGUI(null);
      }
    };
    
    selectedObjectFolder.add(settings, 'type').name('Type').disable();
    selectedObjectFolder.add(settings, 'deselect').name('↩ Deselect');
  }

  selectedObjectFolder.open();
}

</script>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.webgl-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.info {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 5px;
  font-family: monospace;
  pointer-events: none;
  max-width: 300px;
}

.info h1 {
  margin: 0 0 10px 0;
  font-size: 1.5em;
}

.info p {
  margin: 5px 0;
  font-size: 0.85em;
  line-height: 1.4;
}

.mode-indicator {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
  transition: all 0.3s ease;
}

.mode-indicator.camera {
  background: rgba(59, 130, 246, 0.3);
  border: 2px solid rgba(59, 130, 246, 0.6);
}

.mode-indicator.transform {
  background: rgba(234, 179, 8, 0.3);
  border: 2px solid rgba(234, 179, 8, 0.6);
}

.mode-indicator .hint {
  font-size: 0.75em;
  opacity: 0.8;
  font-weight: normal;
}
</style>
