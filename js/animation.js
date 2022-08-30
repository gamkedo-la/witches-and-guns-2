export class Animation {
  constructor(frames) {
	this.frames = frames;
	this.index = 0;
	this.playing = typeof(this.frames[this.index]) !== "undefined" && typeof(this.frames[this.index]) !== "undefined";
	this.timer = 0;
  }

  update(dt) {
	if (!this.playing) {
	  return;
	}
	this.timer += dt;
	if (this.timer >= this.frames[this.index].time/1000) {
	  console.log("CHANGING TO FRAME", this.index+1, "FROM", this.frames[this.index], "TIME", this.timer, "FRAMES", this.frames);
	  this.timer = 0;
	  if (++this.index >= this.frames.length) {
		this.playing = false;
		console.log("STOPPED PLAYING", this, "AT", this.index, "LENGTH", this.frames.length);
	  }
	}
  }

  draw(ctx, assets, x, y) {
	if (!this.playing) {
	  return;
	}
	const frame = this.frames[this.index];
	console.log("PLAYING", this, frame);
	ctx.drawImage(assets[frame.id], frame.sx, frame.sy, frame.sWidth, frame.sHeight, Math.round(x), Math.round(y), frame.sWidth, frame.sHeight);
  }
}
