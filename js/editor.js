import {constants} from "./constants.js";
import {Input} from "./input.js";


class Button {
  constructor(x, y, width, height, spriteOffsetX, spriteOffsetY, flipSprite) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.spriteOffsetX = spriteOffsetX;
	this.spriteOffsetY = spriteOffsetY;
	this.mouseBtnWasHeld = false;
	this.flipSprite = flipSprite || false;
  }

  onClick(fun) {
	this.action = fun;
  }

  update(dt, input) {
	const mousePosHere = pointInRectangle(input.mousePos, {
	  x: this.x,
	  y: this.y,
	  width: this.width,
	  height: this.height,
	});
	if (mousePosHere && !input.mouseButtonHeld && this.mouseBtnWasHeld) {
	  this.action();
	}
	this.mouseBtnWasHeld = mousePosHere && input.mouseButtonHeld;				  
  }

  draw(ctx, assets) {
	if (this.flipSprite) {
	  ctx.translate(this.x + this.width, this.y);
	  ctx.scale(-1, 1);
	  ctx.drawImage(assets.editorUI, this.spriteOffsetX, this.spriteOffsetY, this.width, this.height, 0, 0, this.width, this.height);
	  ctx.setTransform(1, 0, 0, 1, 0, 0);
	} else {
	  ctx.drawImage(assets.editorUI, this.spriteOffsetX, this.spriteOffsetY, this.width, this.height, this.x, this.y, this.width, this.height);
	}
	if (this.mouseBtnWasHeld) {
	  const oldAlpha = ctx.globalAlpha;
	  ctx.globalAlpha = .3;
	  ctx.fillStyle = "white";
	  ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
	  ctx.globalAlpha = oldAlpha;
	}
  }
}

class ToolButton extends Button {
  static WIDTH = 17;
  static HEIGHT = 17;

  constructor(editor, spriteOffsetX, spriteOffsetY, order, containerY) {
	super(
	  Math.floor(order/2)*ToolButton.WIDTH,
	  (order%2)*ToolButton.HEIGHT + containerY,
	  ToolButton.WIDTH,
	  ToolButton.HEIGHT,
	  spriteOffsetX,
	  spriteOffsetY,
	  false,
	);
	this.editor = editor;
	this.order = order;
  }

  action() {
	console.log("CLICKED", this);
  }
}

class PlayButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, 0, 0, order, containerY);
  }
  action() {
	this.editor.toggle();
  }
}

class EnemyButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH, 0, order, containerY);
  }
}

class CopyButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*2, 0, order, containerY);
  }
}

class UndoButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*3, 0, order, containerY);
  }
}

class HandButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, 0, ToolButton.HEIGHT, order, containerY);
  }
}

class WayPointButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH, ToolButton.HEIGHT, order, containerY);
  }
}

class TrashButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*2, ToolButton.HEIGHT, order, containerY);
  }
  action() {
	this.editor.deleteSelected();
  }
}

class SaveButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*3, ToolButton.HEIGHT, order, containerY);
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
	  enemyPalette: new EnemyPalette(this, ToolButton.WIDTH*Editor.buttonSpecs.length/2, 184 + TimeSlider.HEIGHT),
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
	this.dragOffset = {x: 0, y: 0};
	this.selectedEnemy = null;
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
			  this.dragOffset.x = this.dragObj.x - mouseX;
			  this.dragOffset.y = this.dragObj.y - mouseY;
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
			  this.dragOffset.x = this.dragObj.x - mouseX;
			  this.dragOffset.y = this.dragObj.y - mouseY;
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
	}
	if (this.isDragging) {
	  if (input.mouseButtonHeld) {
		this.dragObj.x = input.mousePos.x + this.dragOffset.x;
		this.dragObj.y = input.mousePos.y + this.dragOffset.y;
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
	return this.components.timeSlider.sliderPos;
  }

  dropEnemy() {
	const index = this.getTimeIndex();
	if (typeof this.data[index] === "undefined") {
	  this.data[index] = [];
	}
	this.data[index].push(this.dragObj.enemy);
	this.selectedEnemy = {
	  enemy: this.dragObj.enemy,
	  index: index,
	  subindex: this.data[index].length - 1
	};
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
	if (this.selectedEnemy !== null && timeIndex === this.selectedEnemy.index) {
	  ctx.setLineDash([2, 3]);
	  ctx.strokeStyle = "lime";
	  ctx.strokeRect(Math.round(this.selectedEnemy.enemy.x), Math.round(this.selectedEnemy.enemy.y), this.selectedEnemy.enemy.width, this.selectedEnemy.enemy.height);
	  ctx.setLineDash([]);
	}
  }

  toggle() {
	this.enabled = !this.enabled;
  }

  deleteSelected() {
	if (this.selectedEnemy !== null && this.getTimeIndex() === this.selectedEnemy.index) {
	  this.data[this.selectedEnemy.index].splice(this.selectedEnemy.subindex, 1);
	  this.selectedEnemy = null;
	}
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
  static MAX_TIME = 100000; // ms
  static HEIGHT = 12;
  static BTN_WIDTH = 7;
  static TIME_STEP = 250; // ms
  
  constructor(editor) {
	this.editor = editor;
	this.sliderPos = 0;
	this.containerY = 240 - TimeSlider.HEIGHT;
	this.y = 184;
	this.isDragging = false;
	this.maxPos = (constants.VIEWABLE_WIDTH - TimeSlider.BTN_WIDTH)/2;
	this.leftBtn = new Button(0, this.y, TimeSlider.BTN_WIDTH, TimeSlider.HEIGHT, 74, 20);
	this.leftBtn.onClick(() => this.stepLeft());
	this.rightBtn = new Button(constants.VIEWABLE_WIDTH - TimeSlider.BTN_WIDTH, this.y, TimeSlider.BTN_WIDTH, TimeSlider.HEIGHT, 74, 20, true);
	this.rightBtn.onClick(() => this.stepRight());
  }

  getSelectedTime() {
	return this.sliderPos*TimeSlider.TIME_STEP;
  }

  stepLeft() {
	this.sliderPos = Math.max(0, this.sliderPos - 1);
	console.log("Changed time slider position", this.sliderPos, "TIME:", this.getSelectedTime());
  }

  stepRight() {
	this.sliderPos = Math.min(this.maxPos, this.sliderPos + 1);
	console.log("Changed time slider position", this.sliderPos, "TIME:", this.getSelectedTime());
  }

  screenPosToSliderPos(x) {
	return Math.min(TimeSlider.MAX_TIME/TimeSlider.TIME_STEP, Math.max(0, Math.floor((x - TimeSlider.BTN_WIDTH)/2)));
  }
  
  update(dt, input) {
	if (this.editor.isDragging) {
	  return;
	}
	this.leftBtn.update(dt, input);
	this.rightBtn.update(dt, input);
	if (input.left) {
	  this.stepLeft();
	}
	if (input.right) {
	  this.stepRight();
	}
	if (input.mouseButtonHeld && input.mousePos.y >= this.y && input.mousePos.y <= this.y + TimeSlider.HEIGHT && input.mousePos.x > TimeSlider.BTN_WIDTH && input.mousePos.x < constants.VIEWABLE_WIDTH - TimeSlider.BTN_WIDTH) {
	  this.sliderPos = this.screenPosToSliderPos(input.mousePos.x);
	  this.isDragging = true;
	} else if (!input.mouseButtonHeld && this.isDragging) {
	  this.isDragging = false;
	  this.sliderPos = this.screenPosToSliderPos(input.mousePos.x);
	  console.log("Changed time slider position", this.sliderPos, "TIME:", this.getSelectedTime());
	}
  }

  draw(ctx, assets) {
	this.leftBtn.draw(ctx, assets);
	for (let i=7; i<ctx.canvas.width - TimeSlider.BTN_WIDTH; i+=2) {
	  ctx.drawImage(assets.editorUI, 81, 20, 2, TimeSlider.HEIGHT, i, this.y, 2, TimeSlider.HEIGHT);
	}
	this.rightBtn.draw(ctx, assets);
	ctx.fillStyle = "yellow";
	ctx.fillRect(Math.floor(this.sliderPos*2) + TimeSlider.BTN_WIDTH, this.y + 2, 1, 6);
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
