import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {Prop} from "./prop.js";
import {Item} from "./item.js";
import {getSortedActiveEntities} from "./utils.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static #TIMER = 0;
  static #WAVE_TIMER = 0;
  static #SCROLL_SPEED = 256;
  static #LEVEL_TIME = 10;
  static #BACKGROUNDS_MAP = {
	graveyard: ["graveyardBG"],
	default: ["levelBG", "levelBG2", "levelBG3", "levelBG4"],
  }

  constructor(data, width, height, player) {
	this.levelData = data;
	this.backgrounds = Level.#BACKGROUNDS_MAP[data.name] || Level.#BACKGROUNDS_MAP.default;
	if (this.backgrounds.length < 4) {
	  this.backgrounds = this.backgrounds.concat(Array(4 - this.backgrounds.length).fill("transparentBG"));
	}
	this.width = width;
	this.offset = 0;	// number of pixels camera has moved to the right
	this.enemies = [];
	this.props = data.props.map(
	  propSpec => Prop.spawn(propSpec.x, propSpec.y, propSpec.width, propSpec.height, propSpec.imageSpec)
	);
	this.player = player;
	this.activeEntities = [];
	this.levelTimerDisabled = false;
	this.finished = false;
	this.maxTimeIndex = this.getMaxTimeIndex();
  }

  disableLevelTimer() {
	this.levelTimerDisabled = true;
  }

  getMaxTimeIndex() {
	return Math.max(...Object.values(this.levelData.walkways).map(walkway => walkway.findLastIndex(wave => wave !== null && wave.length > 0)));
  }

  reset(data) {
	Level.#TIMER = 0;
	Level.#WAVE_TIMER = 0;
	this.levelData = data;
	this.offset = 0;
	this.enemies = [];
	for (const entity of getSortedActiveEntities()) {
	  entity.live = false;
	  entity.needsUpdate = false;
	}
	for (const prop of this.props) {
	  prop.live = true;
	  prop.needsUpdate = true;
	}
	this.levelTimerDisabled = false;
	this.finished = false;
	this.maxTimeIndex = this.getMaxTimeIndex();
  }

  scrollLeft(dt) {
	this.offset = Math.max(0, this.offset - Level.#SCROLL_SPEED*dt);
  }

  scrollRight(dt) {
	this.offset = Math.min(this.offset + Level.#SCROLL_SPEED*dt, this.width - constants.VIEWABLE_WIDTH);
  }

  update(dt) {
	Level.#TIMER += dt;
	if (!this.levelTimerDisabled && Level.#LEVEL_TIME - Level.#TIMER <= 0) {
	  console.log("LEVEL FINISHED!!");
	  this.finished = true;
	  return;
	}
	Level.#WAVE_TIMER += dt;
	const timeIndex = Math.floor(Level.#TIMER*1000/constants.TIME_SLOT);
	if (Level.#WAVE_TIMER*1000 > constants.TIME_SLOT) {
	  if (typeof(this.enemies[timeIndex - 1]) === "undefined") {
		this.enemies[timeIndex - 1] = [];
	  }
	  for (const walkway of Object.keys(this.levelData.walkways).sort()) {
		for (const enemyRef of (this.levelData.walkways[walkway][timeIndex - 1] || [])) {
		  const enemySpec = Object.assign(enemyRef, Enemy.KINDS[enemyRef.name] || {});
		  const count = enemySpec.count || 1;
		  for (let i=0; i<count; i++) {
			const endX = enemySpec.endX + i*enemySpec.width;
			const sfx = typeof(Enemy.KINDS[enemySpec.kind]) == "undefined" ? Enemy.KINDS[enemySpec.name].sfx : Enemy.KINDS[enemySpec.kind].sfx;
			const enemy = Enemy.spawn(
			  enemySpec.x + i*enemySpec.width,
			  Number(walkway) - enemySpec.height,
			  enemySpec.width,
			  enemySpec.height,
			  enemySpec.imageSpec,
			  enemySpec.bounty,
			  endX,
			  sfx,
			  enemySpec.timeToAttack,
			  enemySpec.timeToReturn,
			);
			this.enemies[timeIndex - 1].push(enemy);
		  }
		}
	  }
	  Level.#WAVE_TIMER = 0;
	  // reset when timer reaches max
	  if (timeIndex >= this.maxTimeIndex && Array.from(Enemy.alive()).length <= 0) {
		Level.#TIMER = 0;
		this.enemies = [];
	  }
	}
	for (let i=0; i<=timeIndex; i++) {
	  const accTime = Level.#TIMER - i*constants.TIME_SLOT/1000;
	  for (const prop of Prop.alive()) {
		prop.update(accTime, this.player);
	  }
	  for (const item of Item.alive()) {
		item.update(accTime, this.player);
	  }
	  if (typeof this.enemies[i] === "undefined") {
		continue;
	  }
	  for (const enemy of this.enemies[i]) {
		if (enemy.needsUpdate) {
		  enemy.update(accTime, this.player);
		}
	  }
	}
	for (const projectile of Projectile.alive()) {
	  projectile.update(dt);
	}
	this.activeEntities = getSortedActiveEntities();
  }

  // render moon, stars, sky, trees, etc with parallax layers
  drawBG(ctx, assets) {

    ctx.drawImage(assets[this.backgrounds[0]],  Math.round(this.offset/5), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(assets[this.backgrounds[1]], Math.round(this.offset/4)+12, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(assets[this.backgrounds[2]], Math.round(this.offset/3)-13, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(assets[this.backgrounds[3]], Math.round(this.offset/2)+7, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);

  }

  draw(ctx, assets) {
    
    this.drawBG(ctx,assets);
	
    // TODO: filter out off-screen entities
    for (const entity of this.activeEntities) {
	  entity.draw(ctx, assets, this.offset);
	}
	if (this.levelTimerDisabled) {
	  return;
	}
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.fillStyle = "white";
	ctx.font = "bold 18px sans";
	ctx.textAlign = "center";
	const timerStr = (Math.round(Level.#LEVEL_TIME - Level.#TIMER)).toString().padStart(2, "0");
	ctx.fillText(timerStr, Math.round(ctx.canvas.width/2), 16);
	ctx.textAlign = oldAlign;
	ctx.font = oldFont;
  }

  blast(ctx, assets) {
	for (const entity of this.activeEntities) {
	  entity.blast(ctx, assets);
	}
  }
}
