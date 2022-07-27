export class Entity {
  // NOTE: INSTANCES static attribute must be provided by subclasses
  static alive = function* () {
	for (const entity of this.INSTANCES) {
	  if (entity.live) {
		yield entity;
	  }
	}
  }

  static spawn(...args) {
	let entity = this.INSTANCES.filter(e => !e.live).pop();
	if (typeof entity == "undefined") {
	  entity = new this(...args);
	  this.INSTANCES.push(entity);
	  console.log("Created new entity", entity);
	} else {
	  entity.init(...args);
	  console.log("Recycled entity", entity);
	}
	return entity;
  }
  constructor(x, y, width, height, imageSpec, ...rest) {
	this.init(x, y, width, height, imageSpec, ...rest);
  }

  init(x, y, width, height, imageSpec, ...rest) {
	this.live = true;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.imageSpec = imageSpec;
  }

  draw(ctx, assets, offset) {
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
  }
}
