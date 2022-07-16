import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static #TIMER = 0;
  static #WAVE_TIMER = 0;
  static #SCROLL_SPEED = 256;

  constructor(data, width, height, player) {
	this.levelData = data;
	this.width = width;
	this.offset = 0;	// number of pixels camera has moved to the right
	this.enemies = [];
	this.player = player;
  }

  reset(data) {
	Level.#TIMER = 0;
	Level.#WAVE_TIMER = 0;
	this.levelData = data;
	this.offset = 0;
	for (const enemy of Enemy.alive()) {
	  enemy.live = false;
	}
  }

  scrollLeft(dt) {
	this.offset = Math.max(0, this.offset - Level.#SCROLL_SPEED*dt);
  }
  scrollRight(dt) {
	this.offset = Math.min(this.offset + Level.#SCROLL_SPEED*dt, this.width - constants.VIEWABLE_WIDTH);
  }

  update(dt) {
	Level.#TIMER += dt;
	Level.#WAVE_TIMER += dt;
	const timeIndex = Math.floor(Level.#TIMER*1000/constants.TIME_SLOT);
	if (Level.#WAVE_TIMER*1000 > constants.TIME_SLOT) {
	  if (typeof(this.enemies[timeIndex - 1]) === "undefined") {
		this.enemies[timeIndex - 1] = [];
	  }
	  for (const walkway of Object.keys(this.levelData.walkways).sort()) {
		for (const enemySpec of (this.levelData.walkways[walkway][timeIndex - 1] || [])) {
		  const enemy = Enemy.spawn(enemySpec.x, Number(walkway) - enemySpec.height, enemySpec.imageSpec, enemySpec.endX);
		  this.enemies[timeIndex - 1].push(enemy);
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
	// TODO: reset when timer reaches max
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.levelBG, Math.round(this.offset), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
	for (const enemy of Enemy.alive()) {
	  enemy.draw(ctx, assets, this.offset);
	}
	for (const projectile of Projectile.alive()) {
	  projectile.draw(ctx, assets, this.offset);
	}
  }
}
