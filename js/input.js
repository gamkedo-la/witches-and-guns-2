export class Input {
  static EDIT = "e";

  constructor(canvas) {
	this.up = this.down = this.left = this.right = this.shoot = false;
	this.edit = false;
	this.onReleaseHooks = {};
	this.mousePos = {x: null, y: null};
	this.mouseButtonHeld = false;
	const input = this;
	document.addEventListener("keydown", event => input.keyPress(event));
	document.addEventListener("keyup", event => input.keyRelease(event));
	canvas.addEventListener("mousemove", event => input.updateMousePos(event));
	canvas.addEventListener("mousedown", event => {
	  input.mouseButtonHeld = true;
	});
	canvas.addEventListener("mouseup", event => {
	  input.mouseButtonHeld = false;
	});
  }

  flipInputState(key, value) {
	switch (key) {
	case " ":
	  this.shoot = value;
	  break;
	case "ArrowLeft":
	  this.left = value;
	  break;
	case "ArrowRight":
	  this.right = value;
	  break;
	case "ArrowUp":
	  this.up = value;
	  break;
	case "ArrowDown":
	  this.down = value;
	  break;
	case "e":
	  this.edit = value;
	  break;
	}
  }

  keyPress(event) {
	if (event.defaultPrevented || event.repeat) {
	  return;
	}
	if (event.key == "F12") {
	  return;
	}
	event.preventDefault();
	this.flipInputState(event.key, true);
  }

  keyRelease(event) {
	if (event.defaultPrevented) {
	  return;
	}
	if (event.key == "F12") {
	  return;
	}
	event.preventDefault();
	this.flipInputState(event.key, false);
	for (const hook of (this.onReleaseHooks[event.key] || [])) {
	  hook(event);
	}
  }

  onRelease(key, hook) {
	if (typeof this.onReleaseHooks[key] === "undefined") {
	  this.onReleaseHooks[key] = [hook];
	} else {
	  this.onReleaseHooks[key].push(hook);
	}
  }

  updateMousePos(event) {
	const rect = event.target.getBoundingClientRect();
	const scale = {
	  x: event.target.width/rect.width,
	  y: event.target.height/rect.height
	};
	const root = document.documentElement;
	this.mousePos.x = scale.x*(event.clientX - rect.left - root.scrollLeft);
	this.mousePos.y = scale.y*(event.clientY - rect.top - root.scrollTop);
  }
}
