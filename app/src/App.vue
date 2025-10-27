<template>
  <div class="app">
    <canvas ref="canvas" class="webgl-canvas"></canvas>
    <div class="info">
      <h1>3D Room Designer</h1>
      <p>Left click + drag to rotate | Scroll to zoom</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RoomScene, OrbitControls } from './utils';
import GUI from 'lil-gui';

const canvas = ref<HTMLCanvasElement | null>(null);

let scene: RoomScene | null = null;
let controls: OrbitControls | null = null;
let gui: GUI | null = null;
let animationId: number | null = null;

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

  // Initialize controls
  controls = new OrbitControls(canvas.value, () => {
    if (scene && controls) {
      scene.setCamera(controls.getPosition(), controls.getTarget());
    }
  });

  // Setup GUI
  gui = new GUI();
  
  const cubeFolder = gui.addFolder('Cube');
  const cubeSettings = {
    rotation: 0,
    autoRotate: false
  };

  cubeFolder.add(cubeSettings, 'rotation', 0, Math.PI * 2, 0.01)
    .name('Rotation')
    .onChange((value: number) => {
      scene?.setCubeRotation(value);
    });

  cubeFolder.add(cubeSettings, 'autoRotate').name('Auto Rotate');
  cubeFolder.open();

  // Render loop
  const render = () => {
    if (cubeSettings.autoRotate) {
      cubeSettings.rotation += 0.01;
      if (cubeSettings.rotation > Math.PI * 2) {
        cubeSettings.rotation = 0;
      }
      scene?.setCubeRotation(cubeSettings.rotation);
    }

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
    gui?.destroy();
  });
});
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
}

.info h1 {
  margin: 0 0 10px 0;
  font-size: 1.5em;
}

.info p {
  margin: 0;
  font-size: 0.9em;
}
</style>