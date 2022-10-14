import {Entity} from "./entity.js";
import {constants} from "./constants.js";

export class Item extends Entity {
  static INSTANCES = [];
  static GRAVITY = 256;

  init(x, y, width, height, imageSpec) {
	super.init(x, y, width, height, imageSpec, 10);
	this.hp = Math.Infinity;
	this.enableHurtFX = false;
	this.vel = {x: 0, y: 0};
	this.drop = false;
  }

  update(dt) {
	if (this.drop) {
	  this.vel.y += Item.GRAVITY*dt;
	  this.y += this.vel.y*dt;
	}
	if (this.y > constants.VIEWABLE_HEIGHT - this.height - 2) {
	  this.y = constants.VIEWABLE_HEIGHT - this.height - 2;
	  this.drop = false;
	}
  }
  
  hurt(damage) {
	super.hurt(damage);
	this.drop = true;
	this.vel.y = -128;
  }
}
