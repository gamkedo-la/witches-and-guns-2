import {constants} from "./constants.js";
import {Entity} from "./entity.js";
import {Player} from "./player.js";
import {Projectile} from "./projectile.js";


export class Enemy extends Entity {
  static INSTANCES = [];
  static KINDS = {
	RASPBERRY_DONUT: {
	  imageSpec: {id: "donutSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32},
	  sfx: {death: "donutDeath"}
	},
	CHOCO_DONUT: {
	  imageSpec: {id: "donutSheet", sx: 0, sy: 32, sWidth: 32, sHeight: 32},
	  sfx: {death: "donutDeath"}
	},
	FROSTED_DONUT: {
	  imageSpec: {id: "donutSheet", sx: 0, sy: 64, sWidth: 32, sHeight: 32},
	  sfx: {death: "donutDeath"}
	},
	ESPRESSO: {
	  imageSpec: {id: "expressoGangsterSheet", sx: 0, sy: 0, sWidth: 45, sHeight: 32},
	  sfx: {death: "espressoDeath"}
	},
	EVIL_PRINTER: {
	  imageSpec: {id: "printerSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32},
	  sfx: {death: "printerDeath"}
	}
  };

  init(x, y, width, height, imageSpec, endX, sfx, timeToAttack, timeToReturn) {
	super.init(x, y, width, height, imageSpec, timeToAttack, timeToReturn);
	this.startX = x;
	this.endX = endX;
	this.speed = 64;
	this.velX = Math.sign(this.endX - this.startX)*this.speed;
	this.endXTime = (this.endX - this.startX)/this.velX;
	timeToAttack = typeof(timeToAttack) === "undefined" ? 1 : (timeToAttack || 1);	// wait a second by default before attacking
	this.endAttackTime = this.endXTime + timeToAttack;
	this.timeToReturn = typeof(timeToReturn) === "undefined" ? 1 : (timeToReturn || 1);	// wait a second by default after attacking
	this.attacked = false;
	this.hitTargetHooks = [];
	this.sfx = sfx;
  }

  update(accTime, player) {
	super.update(accTime, player);
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
	  const projectile = Projectile.spawn(
		this.x + this.width/2,	// starting x
		this.y + this.height/2,	// starting y
		1.5,	// width (radius)
		1.5,	// height (not used)
		{id: "bullets", sx: 12, sy: 2, sWidth: 6, sHeight: 6},	// image spec
		{x: player.avatarPos.x + Player.avatarWidth*1.5, y: player.avatarPos.y, height: Player.avatarHeight/2},	// target position
		6,	// speed
		1,	// damage
		this.hitTargetHooks,
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
}
