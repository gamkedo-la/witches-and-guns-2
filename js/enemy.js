import {constants} from "./constants.js";
import {Player} from "./player.js";
import {Projectile} from "./projectile.js";


export class Enemy {
  static #INSTANCES = [];
  static alive = function* () {
	for (const enemy of this.#INSTANCES) {
	  if (enemy.live) {
		yield enemy;
	  }
	}
  }

  static spawn(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn) {
	let enemy = this.#INSTANCES.filter(e => !e.live).pop();
	if (typeof enemy == "undefined") {
	  enemy = new Enemy(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn);
	  this.#INSTANCES.push(enemy);
	  console.log("Created new enemy", enemy);
	} else {
	  enemy.init(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn);
	  console.log("Recycled enemy", enemy);
	}
	return enemy;
  }

  constructor(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn) {
	this.init(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn);
  }

  init(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn) {
	this.imageSpec = imageSpec;
	this.live = true;
	this.startX = this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.endX = endX;
	this.speed = 64;
	this.velX = Math.sign(this.endX - this.startX)*this.speed;
	this.endXTime = (this.endX - this.startX)/this.velX;
	timeToAttack = typeof(timeToAttack) === "undefined" ? 1 : (timeToAttack || 1);	// wait a second by default before attacking
	this.endAttackTime = this.endXTime + timeToAttack;
	this.timeToReturn = typeof(timeToReturn) === "undefined" ? 1 : (timeToReturn || 1);	// wait a second by default after attacking
	this.attacked = false;
	this.hitTargetHooks = [];
  }

  update(accTime, player) {
	if (!this.live) {
	  return;
	}
	if (accTime < this.endXTime) {
	  this.x = this.startX + this.velX*accTime;
	} else if (accTime < this.endAttackTime) {
	  console.log("WAITING TO ATTACK", this);
	  this.x = this.endX;
	} else if (!this.attacked) {
	  this.x = this.endX;
	  const projectile = Projectile.get(
		1.5,
		6,
		{x: this.x + this.width/2, y: this.y + this.height/2},
		{x: player.avatarPos.x + Player.avatarWidth*1.5, y: player.avatarPos.y, height: Player.avatarHeight/2},
		1,
		this.hitTargetHooks,
		{id: "bullets", sx: 12, sy: 2, sWidth: 6, sHeight: 6},
	  );
	  console.log("SHOT", projectile);
	  this.attacked = true;
	} else if (accTime > this.endAttackTime + this.timeToReturn) {
	  this.x = this.endX - this.velX*(accTime - this.endAttackTime - this.timeToReturn);
	  if (this.x + this.width < 0 || this.x > constants.PLAYABLE_WIDTH) {
		this.live = false;
	  }
	} else {
	  this.x = this.endX;
	}
	// TODO: "accelerate" enemy when it's not visible on-screen
  }

  draw(ctx, assets, offset) {
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
  }
}
