export interface TextureOption {
  name: string;
  url: string;
  category: 'wood' | 'wall' | 'tile' | 'fabric' | 'metal';
}

export const PROCEDURAL_TEXTURES: TextureOption[] = [
  { name: '🌲 Wood Parquet (Procedural)', url: 'procedural://wood-parquet', category: 'wood' },
  { name: '🎨 Painted Wall (Procedural)', url: 'procedural://painted-wall', category: 'wall' },
  { name: '🧱 Brick Pattern (Procedural)', url: 'procedural://brick', category: 'wall' },
  { name: '⬜ Checkerboard (Procedural)', url: 'procedural://checkerboard', category: 'tile' },
  { name: '🪵 Oak Wood (Procedural)', url: 'procedural://oak', category: 'wood' },
  { name: '🧵 Fabric (Procedural)', url: 'procedural://fabric', category: 'fabric' },
  { name: '✨ Metal (Procedural)', url: 'procedural://metal', category: 'metal' },
];

export const EXTERNAL_TEXTURES: TextureOption[] = [
  {
    name: '🌳 Dark Wood Floor',
    url: 'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
    category: 'wood'
  },
  {
    name: '🪵 Light Wood',
    url: 'https://threejs.org/examples/textures/hardwood2_bump.jpg',
    category: 'wood'
  },
  {
    name: '🧱 Brick Wall',
    url: 'https://threejs.org/examples/textures/brick_diffuse.jpg',
    category: 'wall'
  },
  {
    name: '🪨 Stone',
    url: 'https://threejs.org/examples/textures/disturb.jpg',
    category: 'wall'
  },
  {
    name: '⬜ White Marble',
    url: 'https://threejs.org/examples/textures/waterdudv.jpg',
    category: 'tile'
  },
  {
    name: '🟫 Terrain',
    url: 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg',
    category: 'fabric'
  },
];

export const ALL_TEXTURES: TextureOption[] = [
  ...PROCEDURAL_TEXTURES,
  ...EXTERNAL_TEXTURES,
];

export const TEXTURE_CATEGORIES = {
  wood: '🌲 Wood',
  wall: '🏠 Walls',
  tile: '⬜ Tiles',
  fabric: '🧵 Fabric',
  metal: '✨ Metal',
};

