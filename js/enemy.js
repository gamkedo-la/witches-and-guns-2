import {constants} from "./constants.js";
import {Entity} from "./entity.js";
import {Player} from "./player.js";
import {Projectile} from "./projectile.js";
import {pointInRectangle} from "./utils.js";
import {Item} from "./item.js";


export class Enemy extends Entity {
  static INSTANCES = [];
  static KINDS = {
	RASPBERRY_DONUT: {
	  imageSpec: {
		id: "donutSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32, animations: {
		  death: [
			{id: "donutSheet", sx: 32, sy: 0, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 64, sy: 0, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 96, sy: 0, sWidth: 32, sHeight: 32, time: 100},
			{id: "donutSheet", sx: 128, sy: 0, sWidth: 32, sHeight: 32, time: 1000},
		  ],
		  hurt: [
			{id: "donutSheet", sx: 160, sy: 0, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 192, sy: 0, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 224, sy: 0, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 256, sy: 0, sWidth: 32, sHeight: 32, time: 90},
		  ],
		},
	  },
	  sfx: {death: "donutDeath"},
	  bounty: 10,
	},
	CHOCO_DONUT: {
	  imageSpec: {
		id: "donutSheet", sx: 0, sy: 32, sWidth: 32, sHeight: 32, animations: {
		  death: [
			{id: "donutSheet", sx: 32, sy: 32, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 64, sy: 32, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 96, sy: 32, sWidth: 32, sHeight: 32, time: 100},
			{id: "donutSheet", sx: 128, sy: 32, sWidth: 32, sHeight: 32, time: 1000},
		  ],
		  hurt: [
			{id: "donutSheet", sx: 160, sy: 32, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 192, sy: 32, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 224, sy: 32, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 256, sy: 32, sWidth: 32, sHeight: 32, time: 90},
		  ],
		},
	  },
	  sfx: {death: "donutDeath"},
	  bounty: 10,
	},
	FROSTED_DONUT: {
	  imageSpec: {
		id: "donutSheet", sx: 0, sy: 64, sWidth: 32, sHeight: 32, animations: {
		  death: [
			{id: "donutSheet", sx: 32, sy: 64, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 64, sy: 64, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 96, sy: 64, sWidth: 32, sHeight: 32, time: 100},
			{id: "donutSheet", sx: 128, sy: 64, sWidth: 32, sHeight: 32, time: 1000},
		  ],
		  hurt: [
			{id: "donutSheet", sx: 160, sy: 64, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 192, sy: 64, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 224, sy: 64, sWidth: 32, sHeight: 32, time: 90},
			{id: "donutSheet", sx: 256, sy: 64, sWidth: 32, sHeight: 32, time: 90},
		  ],
		},
	  },
	  sfx: {death: "donutDeath"},
	  bounty: 10,
	},
	ESPRESSO: {
	  imageSpec: {id: "expressoGangsterSheet", sx: 0, sy: 0, sWidth: 45, sHeight: 32, animations: {}},
	  sfx: {death: "espressoDeath"},
	  bounty: 20,
	},
	EVIL_PRINTER: {
	  imageSpec: {id: "printerSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32, animations: {}},
	  sfx: {death: "printerDeath"},
	  bounty: 30,
	}
  };

  init(x, y, width, height, imageSpec, bounty, endX, sfx, timeToAttack, timeToReturn) {
	super.init(x, y, width, height, imageSpec, bounty, timeToAttack, timeToReturn);
	this.startX = x;
	this.endX = endX || this.startX;
	this.walkSpeed = 64;
	this.popOutSpeed = 48;
	this.startY = y;
	if (this.endX == this.startX) {	// pop out enemy
	  this.endY = this.y - this.height/2;
	  this.velX = 0;
	  this.velY = Math.sign(this.endY - this.startY)*this.popOutSpeed;
	  this.endMoveTime = (this.endY - this.startY)/this.velY;
	} else {
	  this.endY = this.y;
	  this.velY = 0;
	  this.velX = Math.sign(this.endX - this.startX)*this.walkSpeed;
	  this.endMoveTime = (this.endX - this.startX)/this.velX;
	}
	timeToAttack = typeof(timeToAttack) === "undefined" ? 1 : (timeToAttack || 1);	// wait a second by default before attacking
	this.endAttackTime = this.endMoveTime + timeToAttack;
	this.timeToReturn = typeof(timeToReturn) === "undefined" ? 1 : (timeToReturn || 1);	// wait a second by default after attacking
	this.attacked = false;
	this.sfx = sfx;
	this.itemDropChance = Math.random();
  }

  update(accTime, player) {
	super.update(accTime, player);
	if (!this.live) {
	  return;
	}
	if (accTime < this.endMoveTime) {
	  this.move(accTime);
	} else if (accTime < this.endAttackTime) {
	  this.waitToAttack(accTime);
	} else if (!this.attacked) {
	  this.attack(accTime, player);
	} else if (accTime > this.endAttackTime + this.timeToReturn) {
	  this.moveBack(accTime);
	  if (this.x + this.width < 0 || this.x > constants.PLAYABLE_WIDTH || this.y > this.startY) {
		this.live = false;
		this.needsUpdate = false;
	  }
	}
  }

  attack(accTime, player) {
	this.x = this.endX;
	this.y = this.endY;
	this.attacked = true;
	if (player.wasKilled) {
	  return;
	}
	Projectile.spawn(
	  this.x + this.width/2,	// starting x
	  this.y + this.height/2,	// starting y
	  1.5,	// width (radius)
	  1.5,	// height (not used)
	  {id: "bullets", sx: 12, sy: 2, sWidth: 6, sHeight: 6},	// image spec
	  {x: player.avatarPos.x + Player.avatarWidth/2, y: player.avatarPos.y + Player.avatarHeight/2, height: Player.avatarHeight/2},	// target position
	  1,	// speed
	  1,	// damage
	  [(dt, shot) => {
		if (pointInRectangle(shot, Object.assign({width: Player.avatarWidth, height: Player.avatarHeight}, player.avatarPos))) {
		  player.takeShot(this, shot);
		}
	  }],
	);
	this.blastQueue.push("enemyShoot");
  }

  move(accTime) {
	this.x = this.startX + this.velX*accTime;
	this.y = this.startY + this.velY*accTime;
  }

  moveBack(accTime) {
	this.x = this.endX - this.velX*(accTime - this.endAttackTime - this.timeToReturn);
	this.y = this.endY - this.velY*(accTime - this.endAttackTime - this.timeToReturn);
  }

  waitToAttack(accTime) {
	this.x = this.endX;
	this.y = this.endY;
  }
  
  hurt(damage) {
	super.hurt(damage);
	if (this.hp <= 0) {
	  this.blastQueue.push(this.sfx.death);
	}
  }

  die() {
	if (this.itemDropChance >= 0.5) {
	  Item.spawn(this.x, this.y, 15, 23, {id: "gems", sx: 0, sy: 0, sWidth: 15, sHeight: 23});
	}
	super.die();
  }
}


export class Boss extends Enemy {
  static INSTANCES = [];

  move() {
  }

  moveBack() {
  }
}
