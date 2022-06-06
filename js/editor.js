import {constants} from "./constants.js";
import {Input} from "./input.js";



class Button {
  static WIDTH = 17;
  static HEIGHT = 17;

  constructor(editor, spriteOffsetX, spriteOffsetY, order, containerY) {
	this.editor = editor;
	this.order = order;
	this.x = Math.floor(order/2)*Button.WIDTH;
	this.y = (order%2)*Button.HEIGHT + containerY;
	this.spriteOffsetX = spriteOffsetX;
	this.spriteOffsetY = spriteOffsetY;
	this.mouseBtnWasHeld = false;
  }

  action() {
	console.log("CLICKED", this);
  }

  update(dt, input) {
	const mousePosHere = pointInRectangle(input.mousePos, {
	  x: this.x,
	  y: this.y,
	  width: Button.WIDTH,
	  height: Button.HEIGHT,
	});
	if (mousePosHere && !input.mouseButtonHeld && this.mouseBtnWasHeld) {
	  this.action();
	}
	this.mouseBtnWasHeld = mousePosHere && input.mouseButtonHeld;				  
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.editorUI, this.spriteOffsetX, this.spriteOffsetY, Button.WIDTH, Button.HEIGHT, this.x, this.y, Button.WIDTH, Button.HEIGHT);
	if (this.mouseBtnWasHeld) {
	  const oldAlpha = ctx.globalAlpha;
	  ctx.globalAlpha = .3;
	  ctx.fillStyle = "white";
	  ctx.fillRect(this.x + 1, this.y + 1, Button.WIDTH - 2, Button.HEIGHT - 2);
	  ctx.globalAlpha = oldAlpha;
	}
  }
}

class PlayButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, 0, 0, order, containerY);
  }
  action() {
	this.editor.toggle();
  }
}

class EnemyButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH, 0, order, containerY);
  }
}

class CopyButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH*2, 0, order, containerY);
  }
}

class UndoButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH*3, 0, order, containerY);
  }
}

class HandButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, 0, Button.HEIGHT, order, containerY);
  }
}

class WayPointButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH, Button.HEIGHT, order, containerY);
  }
}

class TrashButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH*2, Button.HEIGHT, order, containerY);
  }
}

class SaveButton extends Button {
  constructor(editor, order, containerY) {
	super(editor, Button.WIDTH*3, Button.HEIGHT, order, containerY);
  }
}

export class Editor {
  static buttonSpecs = [
	PlayButton,
	HandButton,
	EnemyButton,
	WayPointButton,
	CopyButton,
	TrashButton,
	UndoButton,
	SaveButton,
  ];
  constructor() {
	this.enabled = true;
	this.components = {
	  timeSlider: new TimeSlider(this),
	  enemyPalette: new EnemyPalette(this, Button.WIDTH*Editor.buttonSpecs.length/2, 184 + TimeSlider.HEIGHT),
	  stageSlider: new StageSlider(this),
	};
	const buttonsY = this.components.timeSlider.y + TimeSlider.HEIGHT;
	const editor = this;
	this.buttons = Editor.buttonSpecs.map((BtnClass, i) => {
	  return new BtnClass(editor, i, buttonsY);
	});
	this.dragObj = {};
	this.isDragging = false;
	this.data = Array(Math.ceil(TimeSlider.MAX_TIME/constants.TIME_SLOT));
	this.stageOffset = 0;
  }

  scrollRight(offset) {
	this.stageOffset += offset;
	this.stageOffset = Math.min(this.stageOffset, constants.PLAYABLE_WIDTH);
  }

  scrollLeft(offset) {
	this.stageOffset -= offset;
	this.stageOffset = Math.max(this.stageOffset, 0);
  }

  update(dt, input) {
	const mouseX = input.mousePos.x;
	const mouseY = input.mousePos.y;
	if (!this.isDragging) {
	  if (input.mouseButtonHeld && (mouseY < this.components.timeSlider.y || mouseY > this.components.timeSlider.y + TimeSlider.HEIGHT)) {
		const dragFromPalette = mouseX > this.components.enemyPalette.x && mouseX < this.components.enemyPalette.x + this.components.enemyPalette.width && mouseY > this.components.enemyPalette.y && mouseY < this.components.enemyPalette.y + this.components.enemyPalette.height;
		if (dragFromPalette) {
		  for (const box of this.components.enemyPalette.enemyBoxes) {
			if (mouseX > box.x && mouseX < box.x + box.width && mouseY > box.y && mouseY < box.y + box.height) {
			  this.isDragging = true;
			  this.dragObj = {
				x: box.x,
				y: box.y,
				width: box.width,
				height: box.height,
				enemy: Object.assign({}, box.enemy),
			  };
			  break;
			}
		  }
		} else {
		  const enemies = this.getEnemiesForTime();
		  for (const [i, enemy] of enemies.entries()) {
			if (mouseX > enemy.x && mouseX < enemy.x + enemy.width && mouseY > enemy.y && mouseY < enemy.y + enemy.height) {
			  this.isDragging = true;
			  Object.assign(this.dragObj, {
				x: enemy.x,
				y: enemy.y,
				width: enemy.width,
				height: enemy.height,
				enemy: enemy,
			  });
			  enemies.splice(i, 1);
			  break;
			}
		  }
		}
	  } 
	}
	for (const component of Object.values(this.components)) {
	  component.update(dt, input);
	}
	for (const [i, btn] of this.buttons.entries()) {
	  btn.update(dt, input);
	  // btn.draw(ctx, assets, this.components.timeSlider.y + TimeSlider.HEIGHT, i);
	}
	if (this.isDragging) {
	  if (input.mouseButtonHeld) {
		this.dragObj.x = input.mousePos.x;
		this.dragObj.y = input.mousePos.y;
	  } else {
		this.isDragging = false;
		if (this.dragObj.x > 0 && this.dragObj.x + this.dragObj.width < this.components.enemyPalette.containerX && this.dragObj.y < this.components.timeSlider.y) {
		  // drop on stage
		  this.dragObj.enemy.x = this.dragObj.x;
		  this.dragObj.enemy.y = this.dragObj.y;
		  this.dragObj.enemy.width = this.dragObj.width;
		  this.dragObj.enemy.height = this.dragObj.height;
		  this.dragObj.enemy.alive = true;
		  this.dropEnemy();
		}
	  }
	}
  }

  getTimeIndex() {
	return this.components.timeSlider.selectedTime/constants.TIME_SLOT;
  }

  dropEnemy() {
	const index = this.getTimeIndex();
	if (typeof this.data[index] === "undefined") {
	  this.data[index] = [];
 }
	this.data[index].push(this.dragObj.enemy);
	console.log("DATA UPDATED", this.data);
  }

  getEnemiesForTime() {
	return this.data[this.getTimeIndex()] || [];
  }

  draw(ctx, assets) {
	// TODO: draw stage wings
	ctx.drawImage(assets.levelBG, this.stageOffset, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
	for (const component of Object.values(this.components)) {
	  component.draw(ctx, assets);
	}
	for (const enemy of this.getEnemiesForTime()) {
	  ctx.fillStyle = enemy.color;
	  ctx.fillRect(Math.round(enemy.x), Math.round(enemy.y), enemy.width, enemy.height);
	}
	const timeIndex = this.getTimeIndex();
	const oldAlpha = ctx.globalAlpha;
	ctx.globalAlpha = 0.3;

	for (let i=0; i<this.data.length; i++) {
	  const enemies = this.data[i];
	  if (i >= timeIndex || typeof enemies === "undefined") {
		continue;
	  }
	  const time = (timeIndex - i)*constants.TIME_SLOT;
	  for (const enemy of enemies) {
		ctx.fillStyle = enemy.color;
		const updated = enemy.updater(enemy, time/1000);
		if (updated.alive) {
		  ctx.fillRect(Math.round(updated.x), Math.round(updated.y), enemy.width, enemy.height);
		}
	  }
	}
	ctx.globalAlpha = oldAlpha;
	if (this.isDragging) {
	  ctx.fillStyle = this.dragObj.enemy.color;
	  const oldAlpha = ctx.globalAlpha;
	  ctx.globalAlpha = 0.5;
	  ctx.fillRect(Math.round(this.dragObj.x), Math.round(this.dragObj.y), this.dragObj.width, this.dragObj.height);
	  ctx.globalAlpha = oldAlpha;
	}
	// draw buttons
	for (const [i, btn] of this.buttons.entries()) {
	  btn.draw(ctx, assets, this.components.timeSlider.y + TimeSlider.HEIGHT, i);
	}
  }

  toggle() {
	this.enabled = !this.enabled;
  }
}

function pointInRectangle(point, rectangle) {
  return point.x > rectangle.x && point.y > rectangle.y && point.x < rectangle.x + rectangle.width && point.y < rectangle.y + rectangle.height;
}

class StageSlider {
  static btnSize = 11;

  constructor(editor) {
	this.editor = editor;
	this.slidePos = 0;
	this.leftBtn = {
	  x: 0,
	  y: constants.VIEWABLE_HEIGHT - StageSlider.btnSize,
	  width: StageSlider.btnSize,
	  height: StageSlider.btnSize
	};
	this.rightBtn = {
	  x: constants.VIEWABLE_WIDTH - StageSlider.btnSize,
	  y: constants.VIEWABLE_HEIGHT - StageSlider.btnSize,
	  width: StageSlider.btnSize,
	  height: StageSlider.btnSize
	};
	this.mouseHeldOnLeftBtn = false;
	this.mouseHeldOnRightBtn = false;
  }

  update(dt, input) {
	const mousePosOnLeftBtn = pointInRectangle(input.mousePos, this.leftBtn);
	if (mousePosOnLeftBtn && !input.mouseButtonHeld && this.mouseHeldOnLeftBtn) {
	  this.editor.scrollLeft(20);
	}
	this.mouseHeldOnLeftBtn = mousePosOnLeftBtn && input.mouseButtonHeld;
	const mousePosOnRightBtn = pointInRectangle(input.mousePos, this.rightBtn);
	if (mousePosOnRightBtn && !input.mouseButtonHeld && this.mouseHeldOnRightBtn) {
	  this.editor.scrollRight(20);
	}
	this.mouseHeldOnRightBtn = mousePosOnRightBtn && input.mouseButtonHeld;
  }

  draw(ctx, assets) {
	const y = ctx.canvas.height - StageSlider.btnSize;
	ctx.drawImage(assets.editorUI, 74, 0, StageSlider.btnSize, StageSlider.btnSize, 0, y, StageSlider.btnSize, StageSlider.btnSize);
	ctx.translate(ctx.canvas.width, y);
	ctx.scale(-1, 1);
	ctx.drawImage(assets.editorUI, 74, 0, StageSlider.btnSize, StageSlider.btnSize, 0, 0, StageSlider.btnSize, StageSlider.btnSize);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class TimeSlider {
  static SPEED = 2;
  static MAX_TIME = 22000; // ms
  static HEIGHT = 12;
  
  constructor(editor) {
	this.editor = editor;
	this.sliderPos = 0;
	this.containerY = 240 - TimeSlider.HEIGHT;
	this.y = 184;
	this.isDragging = false;
	this.selectedTime = 0; // in ms
	this.sliderWidth = Math.floor(this.timeToPos(constants.TIME_SLOT)) - 2;
  }

  pos2Time(pos) {
	const time = Math.round((TimeSlider.MAX_TIME / (426)) * pos);
	return time - (time % constants.TIME_SLOT);
  }

  timeToPos(time) {
	return (426 / TimeSlider.MAX_TIME) * time;
  }
  
  update(dt, input) {
	if (this.editor.isDragging) {
	  return;
	}
	// TODO: implement discrete steps
	if (input.left) {
	  this.selectedTime = Math.max(0, this.selectedTime - TimeSlider.TIME_SLOT);
	  this.sliderPos = this.timeToPos(this.selectedTime);
	  console.log("Changed time slider position", this.sliderPos, "TIME:", this.selectedTime);
	}
	if (input.right) {
	  this.selectedTime = Math.max(TimeSlider.MAX_TIME, this.selectedTime + TimeSlider.TIME_SLOT);
	  this.sliderPos = this.timeToPos(this.selectedTime);
	  console.log("Changed time slider position", this.sliderPos, "TIME:", this.selectedTime);
	}
	if (input.mouseButtonHeld && input.mousePos.y >= this.y && input.mousePos.y <= this.y + TimeSlider.HEIGHT) {
	  this.sliderPos = Math.min(Math.max(input.mousePos.x, 0), 426 - 10);
	  this.isDragging = true;
	} else if (!input.mouseButtonHeld && this.isDragging) {
	  this.isDragging = false;
	  this.selectedTime = this.pos2Time(this.sliderPos);
	  this.sliderPos = this.timeToPos(this.selectedTime) + 1;
	  console.log("Changed time slider position", this.sliderPos, "TIME:", this.selectedTime);
	}
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.editorUI, 74, 20, 7, TimeSlider.HEIGHT, 0, this.y, 7, TimeSlider.HEIGHT);
	for (let i=7; i<ctx.canvas.width - 7; i+=2) {
	  ctx.drawImage(assets.editorUI, 81, 20, 2, TimeSlider.HEIGHT, i, this.y, 2, TimeSlider.HEIGHT);
	}
	ctx.translate(ctx.canvas.width, this.y);
	ctx.scale(-1, 1);
	ctx.drawImage(assets.editorUI, 74, 20, 7, TimeSlider.HEIGHT, 0, 0, 7, TimeSlider.HEIGHT);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = "yellow";
	ctx.fillRect(Math.round(this.sliderPos), this.y + 2, 1, 6);
  }
}

function updateGhost(ghost, dt) {
  const speed = 20;
  const updated = Object.create(ghost);
  updated.x += speed*dt;
  return updated;
}

function updateGoblin(goblin, dt) {
  const speed = 32;
  const updated = Object.create(goblin);
  updated.x += speed*dt;
  return updated;
}

function updateZombie(zombie, dt) {
  const speed = 10;
  const updated = Object.create(zombie);
  updated.x += speed*dt;
  return updated;
}

function updateSkeleton(skeleton, dt) {
  const speed = 24;
  const updated = Object.create(skeleton);
  updated.y += speed*dt;
  return updated;
}

class EnemyPalette {
  static margin = 4;
  static boxSize = 32;
  static scrollBtnWidth = 6;
  
  constructor(editor, x, y) {
	this.editor = editor;
	this.x = x;
	this.y = y;
	this.containerX = 426 - 32;
	this.height = 240 - 24;
	this.enemies = [
	  {name: "GHOST", color: "pink", updater: updateGhost},
	  {name: "GOBLIN", color: "red", updater: updateGoblin},
	  {name: "ZOMBIE", color: "orange", updater: updateZombie},
	  {name: "SKELETON", color: "magenta", updater: updateSkeleton},
	  {name: "EVILEYE", color: "yellow", updater: updateGhost},
	];
	const enemyBoxX = this.containerX + EnemyPalette.margin;
	this.enemyBoxes = this.enemies.map((enemy, i) => ({
	  x: this.x + 10 + i*EnemyPalette.boxSize,
	  y: this.y + EnemyPalette.margin,
	  width: EnemyPalette.boxSize - EnemyPalette.margin*2,
	  height: EnemyPalette.boxSize - EnemyPalette.margin*2,
	  enemy: enemy,
	}));
	this.width = EnemyPalette.boxSize*this.enemyBoxes.length + EnemyPalette.scrollBtnWidth*2;
	this.isDragging = false;
	this.dragObj = {};
  }

  update(dt, input) {
  }

  draw(ctx, assets) {
	// draw left scroll button
	ctx.drawImage(assets.editorUI, 85, 0, EnemyPalette.scrollBtnWidth, 32, this.x, this.y, EnemyPalette.scrollBtnWidth, 32);
	// draw enemy palette
	ctx.fillStyle = "black";
	ctx.fillRect(this.x + EnemyPalette.scrollBtnWidth, this.y, EnemyPalette.boxSize*this.enemyBoxes.length, EnemyPalette.boxSize);
	for (const [i, box] of this.enemyBoxes.entries()) {
	  const offset = i*EnemyPalette.boxSize;
	  ctx.fillStyle = box.enemy.color;
	  // ctx.fillRect(box.x, box.y, EnemyPalette.boxSize, EnemyPalette.boxSize);
	  ctx.drawImage(assets.editorUI, 71, 0, 3, EnemyPalette.boxSize, this.x + EnemyPalette.scrollBtnWidth + offset, this.y, 3, EnemyPalette.boxSize);
	  ctx.fillRect(box.x, box.y, box.width, box.height);
	  ctx.drawImage(assets.editorUI, 68, 0, 3, EnemyPalette.boxSize, this.x + EnemyPalette.scrollBtnWidth + (i+1)*EnemyPalette.boxSize - 3, this.y, 3, EnemyPalette.boxSize);
	}	
	// draw right scroll button
	ctx.translate(this.x + EnemyPalette.scrollBtnWidth*2 + EnemyPalette.boxSize*this.enemyBoxes.length, this.y);
	ctx.scale(-1, 1);
	ctx.drawImage(assets.editorUI, 85, 0, 6, 32, 0, 0, 6, 32);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
