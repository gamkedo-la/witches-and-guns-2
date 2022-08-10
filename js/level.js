import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {Prop} from "./prop.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static #TIMER = 0;
  static #WAVE_TIMER = 0;
  static #SCROLL_SPEED = 256;
  static #LEVEL_TIME = 10;

  constructor(data, width, height, player) {
	this.levelData = data;
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
  }

  disableLevelTimer() {
	this.levelTimerDisabled = true;
  }

  reset(data) {
	Level.#TIMER = 0;
	Level.#WAVE_TIMER = 0;
	this.levelData = data;
	this.offset = 0;
	this.enemies = [];
	for (const enemy of Enemy.alive()) {
	  enemy.live = false;
	}
	for (const prop of this.props) {
	  prop.live = true;
	}
	this.levelTimerDisabled = false;
	this.finished = false;
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
		for (const enemySpec of (this.levelData.walkways[walkway][timeIndex - 1] || [])) {
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
	}
	for (let i=0; i<=timeIndex; i++) {
	  if (typeof this.enemies[i] === "undefined") {
		continue;
	  }
	  for (const enemy of this.enemies[i]) {
		if (enemy.live) {
		  enemy.update(Level.#TIMER - i*constants.TIME_SLOT/1000, this.player);
		}
	  }
	}
	for (const projectile of Projectile.alive()) {
	  projectile.update(dt);
	}
	this.activeEntities = Array.from(Enemy.alive()).concat(Array.from(Prop.alive())).sort((e1, e2) => e1.y - e2.y).concat(Array.from(Projectile.alive()));
	// TODO: reset when timer reaches max
  }

  draw(ctx, assets) {
	// TODO: filter out off-screen entities
	ctx.drawImage(assets.levelBG, Math.round(this.offset), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
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
