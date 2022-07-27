import {constants} from "./constants.js";
import {Entity} from "./entity.js";
import {Player} from "./player.js";
import {Projectile} from "./projectile.js";


export class Enemy extends Entity {
  static INSTANCES = [];
  constructor(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn) {
	super(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn);
	this.init(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn);
  }

  init(x, y, width, height, imageSpec, endX, timeToAttack, timeToReturn) {
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
