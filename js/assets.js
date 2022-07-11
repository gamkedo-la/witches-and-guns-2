const assetSpecs = {
  images: [
	{id: "player", path: "images/julhilde.png"},
	{id: "tile", path: "images/tile.png"},
	{id: "levelBG", path: "images/background.gif"},
	{id: "editorUI", path: "images/editorUI.png"},
	{id: "donutSheet", path: "images/donut.png"},
	{id: "printerSheet", path: "images/printer.png"},
	{id: "graveyardProps", path: "images/graveyardObjects.png"},
  ],
  sounds: [],
  levels: [],
};

async function loadImage(spec) {
  const image = new Image();
  image.src = spec.path;
  await image.decode();
  return [spec.id, image];
}

async function loadSound(spec) {
  return [spec.id, null];
}

async function loadLevel(spec) {
  return [spec.id, null];
}

export function loadAssets() {
  // const [images, sounds, levels] =
  return Promise.all([
	Promise.all(assetSpecs.images.map(spec => loadImage(spec))),
	Promise.all(assetSpecs.sounds.map(spec => loadSound(spec))),
	Promise.all(assetSpecs.levels.map(spec => loadLevel(spec))),
  ]);
}
