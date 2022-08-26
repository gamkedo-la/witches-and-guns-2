import {Entity} from "./entity.js";

export class Prop extends Entity {
  static INSTANCES = [];
  init(x, y, width, height, imageSpec) {
	super.init(x, y, width, height, imageSpec, 10);
	this.hp = 40;
  }
}
