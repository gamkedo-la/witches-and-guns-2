import {Entity} from "./entity.js";
import {constants} from "./constants.js";

export class Item extends Entity {
  static INSTANCES = [];
  static GRAVITY = 220;

  init(x, y, width, height, imageSpec) {
	super.init(x, y, width, height, imageSpec, 10);
	this.hp = Math.Infinity;
	this.enableHurtFX = false;
	this.vel = {x: 0, y: 0};
	this.wasHit = false;
  }

  update(dt) {
	super.update(dt);
	if (this.wasHit) {
	  this.vel.y += Item.GRAVITY*dt;
	  this.y += this.vel.y*dt;
	  if (this.y > constants.VIEWABLE_HEIGHT - this.height - 2);
	}
  }
  
  hurt() {
	super.hurt();
	this.wasHit = true;
	this.vel.y = -200;
  }
}
