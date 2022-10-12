import {constants} from "./constants.js";
import {Entity} from "./entity.js";

export class Projectile extends Entity {
  static INSTANCES = [];

  init(x, y, width, height, imageSpec, target, speed, damage, hooks) {
	super.init(x, y, width, height, imageSpec, target, speed, damage, hooks);
	this.radius = width;
	this.target = target;
	this.velocity = {
	  x: speed*(this.target.x - this.x),
	  y: speed*(this.target.y - this.y)
	};
	this.hooks = hooks;
	this.reachedTarget = false;
    this.startx = x;
    this.starty = y;
	return this;
  }

  update(dt) {
	this.x += this.velocity.x*dt;
	this.y += this.velocity.y*dt;
	this.reachedTarget = this.velocity.y > 0 ? this.y > this.target.y + this.target.height/8 : this.y < this.target.y;
	if (this.reachedTarget) {
	  this.live = false;
	  this.needsUpdate = false;
	  this.hooks.forEach(hook => hook(dt, this));
	}
  }

    // rotates and stretches a bitmap to go from point A to point B, used by Woosh Lines FX
    drawBitmapLine(canvasContext, useBitmap, startX, startY, endX, endY, alpha) {
        var lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        var lineAngle = Math.atan2(endY - startY, endX - startX);
        // edge case: avoid floating point imprecision flickering of angle on small values
        if (lineLength < 1) {
            // we COULD just not render, but this leaves gaps in the effect
            // if we are drawing multiple lines close together
            // return; 
            lineAngle = 0;
            lineLength = 1;
        }
        canvasContext.save();
        canvasContext.translate(startX, startY);
        canvasContext.rotate(lineAngle);
        canvasContext.translate(0, - useBitmap.height / 2);
        canvasContext.globalAlpha = alpha;
        canvasContext.drawImage(useBitmap,
            0, 0, useBitmap.width, useBitmap.height, // src 
            0, 0, lineLength, useBitmap.height);     // dest
        canvasContext.globalAlpha = 1;
        canvasContext.restore();
    }

  draw(ctx, assets, offset) {
	const shotDrawPos = {
	  x: this.reachedTarget ? this.target.x : this.x,
	  y: this.reachedTarget ? this.target.y : this.y,
	};
	// bullet trail
    if (constants.PROJECTILE_TRAILS_ENABLED) this.drawBitmapLine(ctx, assets.bullet_trail, this.startx, this.starty, shotDrawPos.x + constants.BULLET_TRAIL_XOFFSET, shotDrawPos.y  + constants.BULLET_TRAIL_YOFFSET, constants.BULLET_TRAIL_ALPHA);
    // projectile sprite
    ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(shotDrawPos.x - offset - this.imageSpec.sWidth/2), Math.round(shotDrawPos.y - this.imageSpec.sHeight*1.5), this.imageSpec.sWidth, this.imageSpec.sHeight);
  }
}
