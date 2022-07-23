const assetSpecs = {
  images: [
	{id: "player", path: "images/julhilde.png"},
	{id: "tile", path: "images/tile.png"},
	{id: "levelBG", path: "images/background.gif"},
	{id: "editorUI", path: "images/editorUI.png"},
	{id: "donutSheet", path: "images/donut.png"},
	{id: "printerSheet", path: "images/printer.png"},
	{id: "graveyardProps", path: "images/graveyardObjects.png"},
	{id: "bullets", path: "images/playerBullet-10x10.png"},
  ],
  sounds: [
	{id: "playerShooting1", path: "sounds/player-shoot-1-WG.mp3"},
	{id: "playerShooting2", path: "sounds/player-shoot-2-WG.mp3"},
  ],
  levels: [
	{id: "graveyard", path: "levels/graveyard.json"},
  ],
};

async function loadImage(spec) {
  const image = new Image();
  image.src = spec.path;
  await image.decode();
  return [spec.id, image];
}

async function loadSound(spec, audioCtx) {
  const response = await fetch(spec.path);
  const buffer = await response.arrayBuffer();
  const audio = await audioCtx.decodeAudioData(buffer);
  return [spec.id, audio];
}

async function loadLevel(spec) {
  const response = await fetch(spec.path);
  const data = await response.json();
  return [spec.id, data];
}

export function loadAssets(audioCtx) {
  // const [images, sounds, levels] =
  return Promise.all([
	Promise.all(assetSpecs.images.map(spec => loadImage(spec))),
	Promise.all(assetSpecs.sounds.map(spec => loadSound(spec, audioCtx))),
	Promise.all(assetSpecs.levels.map(spec => loadLevel(spec))),
  ]);
}
