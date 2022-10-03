const assetSpecs = {
  images: [
	{id: "player", path: "images/julhilde.png"},
	{id: "tile", path: "images/tile.png"},
	{id: "levelBG", path: "images/background.gif"},
	{id: "levelBG2", path: "images/background2.gif"},
	{id: "levelBG3", path: "images/background3.gif"},
	{id: "levelBG4", path: "images/background4.gif"},
	{id: "transparentBG", path: "images/background-transparent.gif"},
	{id: "graveyardBG", path: "images/mountaingraveyard23final.png"},
	{id: "editorUI", path: "images/editorUI.png"},
	{id: "donutSheet", path: "images/donut.png"},
    {id: "expressoGangsterSheet", path: "images/expressoGangster.png"},
	{id: "printerSheet", path: "images/printer.png"},
	{id: "graveyardProps", path: "images/graveyardObjects.png"},
	{id: "bullets", path: "images/playerBullet-10x10.png"},
	{id: "gems", path: "images/gems.png"},
	{id: "toaster", path: "images/toasterBat.png"},
    {id: "logo", path: "images/logo.png"},
	{id: "menuBG", path: "images/menu_background.gif"},
	{id: "unibrain", path: "images/unibrain.png"},
  ],
  sounds: [
	{id: "playerShooting1", path: "sounds/player-shoot-1-WG.mp3"},
	{id: "playerShooting2", path: "sounds/player-shoot-2-WG.mp3"},
	{id: "donutDeath", path: "sounds/zombie-doughnut-death-short.mp3"},
	{id: "printerDeath", path: "sounds/possessed-printer-death-WG.mp3"},
	{id: "espressoDeath", path: "sounds/espresso-gangster-death-reverb.mp3"},
	{id: "enemyShoot", path: "sounds/enemy_shoot.wav"},
	{id: "printerShoot", path: "sounds/printer_shooting_2.mp3"},
	{id: "explosion1", path: "sounds/explode_1_WG.mp3"},
	{id: "explosion2", path: "sounds/explode_2_WG.mp3"},
	{id: "explosion3", path: "sounds/printer_shooting.mp3"},
	{id: "espressoAttack1", path: "sounds/espresso_shoot_1.mp3"},
	{id: "espressoAttack2", path: "sounds/espresso_shoot_2.mp3"},
	{id: "toasterAttack", path: "sounds/toaster_bat_shooting.mp3"},
	{id: "uniBrainAttack", path: "sounds/unicorn_brain_psionic_attack.mp3"},
  ],
  levels: [
	{id: "graveyard", path: "levels/graveyard.json"},
	{id: "level1", path: "levels/level2.json"},
	{id: "level2", path: "levels/level3.json"},
	{id: "level3", path: "levels/level4.json"},
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
  try {
	const response = await fetch(spec.path);
	const data = await response.json();
	return [spec.id, data];
  } catch (e) {
	console.error("Failed to load", spec, ", ERROR:", e);
	return [spec.id, {background: "levelBG", props: [], walkways: {}}];
  }
}

export function loadAssets(audioCtx) {
  // const [images, sounds, levels] =
  return Promise.all([
	Promise.all(assetSpecs.images.map(spec => loadImage(spec))),
	Promise.all(assetSpecs.sounds.map(spec => loadSound(spec, audioCtx))),
	Promise.all(assetSpecs.levels.map(spec => loadLevel(spec))),
  ]);
}
