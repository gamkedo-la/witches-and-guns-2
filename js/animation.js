export class Animation {
  constructor(frames, hFlip, loop) {
	this.frames = frames;
	this.index = 0;
	this.playing = typeof(this.frames[this.index]) !== "undefined" && typeof(this.frames[this.index]) !== "undefined";
	this.timer = 0;
	this.hFlip = typeof(hFlip) != "undefined" && hFlip;
	this.loop = typeof(loop) != "undefined" && loop;
  }

  update(dt) {
	if (!this.playing) {
	  return;
	}
	this.timer += dt;
	if (this.timer >= this.frames[this.index].time/1000) {
	  this.timer = 0;
	  if (++this.index >= this.frames.length) {
		if (this.loop) {
		  this.index = 0;
		} else {
		  this.playing = false;
		}
	  }
	}
  }

  draw(ctx, assets, x, y) {
	if (!this.playing) {
	  return;
	}
	const frame = this.frames[this.index];
	if (this.hFlip) {
	  ctx.translate(x + frame.sWidth, y);
	  ctx.scale(-1, 1);
	  ctx.drawImage(assets[frame.id], frame.sx, frame.sy, frame.sWidth, frame.sHeight, 0, 0, frame.sWidth, frame.sHeight);
	  ctx.setTransform(1, 0, 0, 1, 0, 0);
	} else {
	  ctx.drawImage(assets[frame.id], frame.sx, frame.sy, frame.sWidth, frame.sHeight, Math.round(x), Math.round(y), frame.sWidth, frame.sHeight);
	}
  }
}
