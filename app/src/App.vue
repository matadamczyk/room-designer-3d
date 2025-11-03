<template>
  <div class="app">
    <canvas ref="canvas" class="webgl-canvas"></canvas>
    <div class="info">
      <h1>3D Room Designer</h1>
      <p><strong>Mouse:</strong> Drag to rotate | Scroll to zoom</p>
      <p><strong>WASD:</strong> Move camera | <strong>Q/E:</strong> Up/Down</p>
      <p><strong>Click:</strong> Select objects | Use GUI to edit</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RoomScene, OrbitControls } from './utils';
import { SceneObject } from './types/FurnitureObject';
import GUI from 'lil-gui';

const canvas = ref<HTMLCanvasElement | null>(null);

let scene: RoomScene | null = null;
let controls: OrbitControls | null = null;
let gui: GUI | null = null;
let animationId: number | null = null;

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
  table.position[0] = 0;
  table.position[2] = -2;

  const chair1 = scene.addFurniture('chair');
  chair1.position[0] = -1.5;
  chair1.position[2] = -2;
  chair1.rotation = Math.PI / 4;

  const chair2 = scene.addFurniture('chair');
  chair2.position[0] = 1.5;
  chair2.position[2] = -2;
  chair2.rotation = -Math.PI / 4;

  const bookshelf = scene.addFurniture('bookshelf');
  bookshelf.position[0] = -8;
  bookshelf.position[2] = 0;

  const sofa = scene.addFurniture('sofa');
  sofa.position[0] = 0;
  sofa.position[2] = 6;
  sofa.rotation = Math.PI;

  // Initialize controls
  controls = new OrbitControls(canvas.value, () => {
    if (scene && controls) {
      scene.setCamera(controls.getPosition(), controls.getTarget());
    }
  });

  // Setup GUI
  setupGUI();

  // Mouse click for selection
  canvas.value.addEventListener('click', (e) => {
    if (!scene) return;
    
    const rect = canvas.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const selected = scene.selectObject(x, y);
    updateSelectedObjectGUI(selected);
  });

  // Render loop
  const render = () => {
    // Update controls (handles WASD movement)
    controls?.update();
    
    if (controls) {
      scene?.setCamera(controls.getPosition(), controls.getTarget());
    }

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
  if (!scene) return;

  gui = new GUI();
  gui.title('3D Room Designer');

  // Scene controls
  const sceneFolder = gui.addFolder('Scene');
  
  const addFurnitureSettings = {
    type: 'table',
    add: () => {
      if (!scene) return;
      const furniture = scene.addFurniture(addFurnitureSettings.type as any);
      // Position randomly within room bounds
      furniture.position[0] = (Math.random() - 0.5) * 8;
      furniture.position[2] = (Math.random() - 0.5) * 8;
      furniture.rotation = Math.random() * Math.PI * 2;
      console.log(`Added ${addFurnitureSettings.type}`);
    }
  };

  sceneFolder.add(addFurnitureSettings, 'type', ['table', 'chair', 'bookshelf', 'sofa', 'lamp']).name('Furniture Type');
  sceneFolder.add(addFurnitureSettings, 'add').name('➕ Add Furniture');
  sceneFolder.open();

  // Textures controls
  const texturesFolder = gui.addFolder('Textures');
  
  const textureSettings = {
    info: 'Click object, then load texture',
    loadTexture: () => {
      if (!scene) return;
      const selected = scene.getSelectedObject();
      if (!selected) {
        alert('Please select an object first (floor, walls, or furniture)');
        return;
      }
      const url = prompt(`Enter texture URL for ${selected.name}:`);
      if (url) {
        scene.loadTextureToSelected(url).then(success => {
          if (success) {
            alert(`Texture loaded to ${selected.name}!`);
          } else {
            alert('Failed to load texture');
          }
        });
      }
    }
  };

  texturesFolder.add(textureSettings, 'info').name('ℹ️ Info').disable();
  texturesFolder.add(textureSettings, 'loadTexture').name('📁 Load Texture to Selected');

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
      posX: furniture.position[0],
      posY: furniture.position[1],
      posZ: furniture.position[2],
      rotation: furniture.rotation * (180 / Math.PI),
      scaleX: furniture.scale[0],
      scaleY: furniture.scale[1],
      scaleZ: furniture.scale[2],
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
      furniture.position[0] = value;
    });
    posFolder.add(settings, 'posY', 0, 4, 0.1).name('Y').onChange((value: number) => {
      furniture.position[1] = value;
    });
    posFolder.add(settings, 'posZ', -9, 9, 0.1).name('Z').onChange((value: number) => {
      furniture.position[2] = value;
    });
    posFolder.open();

    // Rotation control
    selectedObjectFolder.add(settings, 'rotation', 0, 360, 1).name('Rotation (°)').onChange((value: number) => {
      furniture.rotation = value * (Math.PI / 180);
    });

    // Scale controls
    const scaleFolder = selectedObjectFolder.addFolder('Scale');
    scaleFolder.add(settings, 'scaleX', 0.5, 3, 0.1).name('X').onChange((value: number) => {
      furniture.scale[0] = value;
    });
    scaleFolder.add(settings, 'scaleY', 0.5, 3, 0.1).name('Y').onChange((value: number) => {
      furniture.scale[1] = value;
    });
    scaleFolder.add(settings, 'scaleZ', 0.5, 3, 0.1).name('Z').onChange((value: number) => {
      furniture.scale[2] = value;
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
</style>
