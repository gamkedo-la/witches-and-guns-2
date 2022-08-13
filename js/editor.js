import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";
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
  static HEIGHT = 16;

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

class ChainButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*2, 0, order, containerY);
  }

  action() {
	this.editor.chainSelected();
  }
}

class UndoButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH*3, 0, order, containerY);
  }
  action() {
	this.editor.undo();
  }
}

class WalkWayButton extends ToolButton {
  constructor(editor, order, containerY) {
	super(editor, ToolButton.WIDTH, ToolButton.HEIGHT - 1, order, containerY);
  }
  action() {
	this.editor.addWalkWay();
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

  action() {
	this.editor.save().then(() => alert("Level saved correctly"));
  }
}

export class Editor {
  static buttonSpecs = [
	PlayButton,
	TrashButton,
	ChainButton,
	WalkWayButton,
	UndoButton,
	SaveButton,
  ];
  static WP_HANDLE_SIZE = 8;
  static WING_WIDTH = 64;
  static WALKWAY_COVER_DISTANCE = 8;
  static #LEVEL_NAMES = ["graveyard"];	// NOTE: level filenames

  constructor(levelsData, hooks) {
	this.enabled = true;
	this.hooks = hooks;
	this.components = {
	  timeSlider: new TimeSlider(this),
	  enemyPalette: new EnemyPalette(this, ToolButton.WIDTH*Editor.buttonSpecs.length/2, 184 + TimeSlider.HEIGHT),
	  propPalette: new PropPalette(this, (EnemyPalette.boxSize + EnemyPalette.margin)*4 + ToolButton.WIDTH*Editor.buttonSpecs.length/2, 184 + TimeSlider.HEIGHT),
	  stageSlider: new StageSlider(this),
	};
	const buttonsY = this.components.timeSlider.y + TimeSlider.HEIGHT;
	const editor = this;
	this.buttons = Editor.buttonSpecs.map((BtnClass, i) => {
	  return new BtnClass(editor, i, buttonsY);
	});
	this.dragObj = {};
	this.dragWP = {};
	this.dragWW = null;
	this.newWalkWay = null;
	this.enemyWalkWay = null;
	this.isAddingWalkWay = false;
	this.selectedWalkWay = null;
	this.isDragging = false;
	this.isDraggingWP = false;
	this.isDraggingWW = false;
	this.stageOffset = 0;
	this.dragOffset = {x: 0, y: 0};
	this.selectedEnemy = null;
	this.selectedProp = null;
	this.simEnemies = [];
	// TODO: add limit to undoList size
	this.undoList = [];
	this.levels = levelsData;
	this.currentLevelIdx = 0;
	const levelKey = Object.keys(this.levels)[this.currentLevelIdx];
	this.levelData = levelsData[levelKey] || {
	  props: [],
	  walkways: {
		// y positions of walkways: [enemy waves inside walkway]
		150: [],
	  },
	};
  }

  scrollRight(offset) {
	this.stageOffset += offset;
	this.stageOffset = Math.min(this.stageOffset, constants.PLAYABLE_WIDTH - constants.VIEWABLE_WIDTH + Editor.WING_WIDTH);
  }

  scrollLeft(offset) {
	this.stageOffset -= offset;
	this.stageOffset = Math.max(this.stageOffset, -Editor.WING_WIDTH);
  }

  update(dt, input) {
	if (input.justReleasedKeys.has(Input.EDIT)) {
	  this.toggle();
	  return;
	}
	if (input.justReleasedKeys.has("Escape")) {
	  this.exit();
	  return;
	}
	const levelArray = Object.values(this.levels);
	if (input.justReleasedKeys.has("PageDown")) {
	  this.currentLevelIdx = (this.currentLevelIdx + 1) % levelArray.length;
	  this.levelData = levelArray[this.currentLevelIdx];
	  console.log("CHANGED TO LEVEL", Object.keys(this.levels)[this.currentLevelIdx]);
	  this.selectedWalkWay = null;
	  this.selectedEnemy = null;
	  this.selectedProp = null;
	  return;
	}
	if (input.justReleasedKeys.has("PageUp")) {
	  this.currentLevelIdx--;
	  if (this.currentLevelIdx < 0) {
		this.currentLevelIdx = levelArray.length + this.currentLevelIdx;
	  } else {
		this.currentLevelIdx %= levelArray.length;
	  }
	  this.levelData = levelArray[this.currentLevelIdx];
	  console.log("CHANGED TO LEVEL", Object.keys(this.levels)[this.currentLevelIdx]);
	  this.selectedWalkWay = null;
	  this.selectedEnemy = null;
	  this.selectedProp = null;
	  return;
	}
	const mouseX = input.mousePos.x;
	const mouseY = input.mousePos.y;
	const timeIndex = this.getTimeIndex();
	if (this.isAddingWalkWay) {
	  this.newWalkWay = mouseY;
	  if (input.mouseButtonHeld) {
		this.isAddingWalkWay = false;
		if (typeof this.levelData.walkways == "undefined") {
		  this.levelData.walkways = [];
		}
		if (this.newWalkWay < this.components.timeSlider.y) {
		  this.levelData.walkways[Math.round(this.newWalkWay)] = [];	// enemy waves
		} else {
		  console.log("Dropped walkway outside of gameplay area");
		}
		this.newWalkWay = null;
	  }
	} else if (!(this.isDragging || this.isDraggingWP)) {
	  if (input.mouseButtonHeld && (mouseY < this.components.timeSlider.y || mouseY > this.components.timeSlider.y + TimeSlider.HEIGHT)) {
		const dragFromPalette = pointInRectangle(input.mousePos, this.components.enemyPalette) || pointInRectangle(input.mousePos, this.components.propPalette);
		if (dragFromPalette) {
		  const boxes = this.components.enemyPalette.boxes.concat(this.components.propPalette.boxes);
		  for (const box of boxes) {
			if (pointInRectangle(input.mousePos, box)) {
			  this.isDragging = true;
			  this.dragObj = {
				x: box.x,
				y: box.y,
				width: box.entity.width,
				height: box.entity.height,
				entity: Object.assign({}, box.entity),
				new: true,
				// subindex: this.levelData.waves[timeIndex] ? this.levelData.waves[timeIndex].length - 1 : 0,
			  };
			  this.dragOffset.x = this.dragObj.x - mouseX;
			  this.dragOffset.y = this.dragObj.y - mouseY;
			  break;
			}
		  }
		} else {
		  for (const [i, walkway, enemy] of this.getEnemiesForTime()) {
			const wpHandle = {
			  x: enemy.endX ? enemy.endX : enemy.x + enemy.width/2 - Editor.WP_HANDLE_SIZE/2,
			  y: enemy.y + enemy.height/2 - Editor.WP_HANDLE_SIZE/2,
			  width: Editor.WP_HANDLE_SIZE,
			  height: Editor.WP_HANDLE_SIZE,
			};
			if (pointInRectangle({x: mouseX + this.stageOffset, y: mouseY}, wpHandle)) { // clicking inside waypoint area
			  this.isDraggingWP = true;
			  Object.assign(this.dragWP, {
				walkway: walkway,
				index: this.getTimeIndex(),
				subindex: i,
				start: {x: enemy.x + enemy.width/2 - this.stageOffset, y: enemy.y + enemy.height/2},
				end: {x: mouseX - this.stageOffset, y: enemy.y + enemy.height/2},
			  });
			  break;
			} else if (pointInRectangle({x: mouseX + this.stageOffset, y: mouseY}, {x: enemy.x, y: enemy.y, width: enemy.width*(enemy.count||1), height: enemy.height})) {
			  this.isDragging = true;
			  Object.assign(this.dragObj, {
				x: enemy.x,
				y: enemy.y,
				width: enemy.width,
				height: enemy.height,
				entity: enemy,
				endX: enemy.x + this.stageOffset + enemy.width,
				subindex: i,
				oldWW: walkway,
			  });
			  this.dragObj.new = false;
			  this.dragOffset.x = this.dragObj.x - mouseX - this.stageOffset;
			  this.dragOffset.y = this.dragObj.y - mouseY;
			  break;
			}
		  }
		  if (!this.isDragging) {
			for (const [index, prop] of this.levelData.props.entries()) {
			  if (pointInRectangle({x: mouseX + this.stageOffset, y: mouseY}, prop)) {
				this.isDragging = true;
				Object.assign(this.dragObj, {
				  x: prop.x,
				  y: prop.y,
				  width: prop.width,
				  height: prop.height,
				  entity: prop,
				  index: index,
				  new: false,
				});
				this.dragOffset.x = this.dragObj.x - mouseX - this.stageOffset;
				this.dragOffset.y = this.dragObj.y - mouseY;
				break;
			  }
			}
		  }
		}
		if (!(dragFromPalette || this.isDragging || this.isDraggingWP || this.isDraggingWW)) {
		  for (const walkway of Object.keys(this.levelData.walkways)) {
			if (mouseY > walkway - 10 && mouseY < walkway) {
			  this.isDraggingWW = true;
			  this.dragWW = {y: walkway, old: walkway};
			  this.dragOffset.y = walkway - mouseY;
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
	if (this.isDraggingWP) {
	  if (input.mouseButtonHeld) {
		this.dragWP.end.x = input.mousePos.x;
	  } else {
		this.isDraggingWP = false;
		if (this.dragWP.end.x > 0 && this.dragWP.end.x < constants.VIEWABLE_WIDTH) {
		  this.dropWP();
		}
	  }
	} else if (this.isDragging) {
	  if (input.mouseButtonHeld) {
		this.dragObj.x = input.mousePos.x + this.dragOffset.x + this.stageOffset;
		this.dragObj.y = input.mousePos.y + this.dragOffset.y;
		let minY = Number.MAX_SAFE_INTEGER;
		for (const walkWayY of Object.keys(this.levelData.walkways)) {
		  if (Math.abs(walkWayY - mouseY) <= Math.abs(minY - mouseY)) {
			minY = walkWayY;
		  }
		}
		this.enemyWalkWay = minY;
	  } else {
		this.isDragging = false;
		if (this.dragObj.x > -Editor.WING_WIDTH && this.dragObj.x + this.dragObj.width < constants.PLAYABLE_WIDTH + Editor.WING_WIDTH) {
		  this.dropEntity();
		}
	  }
	} else if (this.isDraggingWW) {
	  if (input.mouseButtonHeld) {
		this.dragWW.y = input.mousePos.y + this.dragOffset.y;
	  } else {
		if (this.dragWW.y < this.components.timeSlider.y) {
		  if (this.dragWW.old !== this.dragWW.y.toString()) {
			this.undoList.push(this.takeDataSnapshot());
			this.levelData.walkways[this.dragWW.y.toString()] = this.levelData.walkways[this.dragWW.old].map(waves => {
			  return (waves || []).map(enemy => {
				enemy.y = this.dragWW.y - enemy.height;
				return enemy;
			  });
			});
			delete this.levelData.walkways[this.dragWW.old];
			for (const prop of this.levelData.props.filter(prop => prop.y == this.dragWW.old - prop.height + Editor.WALKWAY_COVER_DISTANCE)) {
			  prop.y = this.dragWW.y - prop.height + Editor.WALKWAY_COVER_DISTANCE;
			}
			this.updateSimEnemies(this.getTimeIndex());
		  }
		  this.selectedWalkWay = this.dragWW.y.toString();
		  this.selectedEnemy = null;
		  this.selectedProp = null;
		} else {
		  console.log("Dropped walkway outside of gameplay area");
		}
		this.isDraggingWW = false;
		this.dragWW = null;
	  }
	}
  }

  updateSimEnemies(timeIndex) {
	// simulate enemies
	this.simEnemies = [];
	for (const [walkway, waves] of Object.entries(this.levelData.walkways)) {
	  for (let i=0; i<timeIndex; i++) {
		const enemySpecs = waves[i];
		if (typeof enemySpecs === "undefined") {
		  continue;
		}
		const time = (timeIndex - i)*constants.TIME_SLOT;
		for (const spec of (enemySpecs || [])) {
		  const count = spec.count || 1;
		  for (let i=0; i<count; i++) {
			const enemy = Enemy.spawn(
			  spec.x + spec.width*i,
			  Number(walkway) - spec.height,
			  spec.width,
			  spec.height,
			  spec.imageSpec,
			  spec.endX + spec.width*i,
			);
			enemy.attacked = true;
			enemy.update(time/1000);
			this.simEnemies.push(enemy);
		  }
		}
	  }
	}
  }

  getTimeIndex() {
	return this.components.timeSlider.sliderPos;
  }

  addEnemy(walkway, enemy, timeIdx) {
	if (timeIdx === null || typeof(timeIdx) === "undefined") {
	  timeIdx = this.getTimeTimeIdx();
	}
	if (typeof this.levelData.walkways[walkway][timeIdx] === "undefined" || this.levelData.walkways[walkway][timeIdx] === null) {
	  this.levelData.walkways[walkway][timeIdx] = [];
	}
	return this.levelData.walkways[walkway][timeIdx].push(enemy) - 1;
  }

  addProp(prop) {
	return this.levelData.props.push(prop) - 1;
  }

  deleteProp(index) {
	this.levelData.props.splice(index, 1);
  }

  dropEntity() {
	this.undoList.push(this.takeDataSnapshot());
	const entity = this.dragObj.entity;
	entity.x = this.dragObj.x;
	switch (entity.type) {
	case "enemy": {
	  entity.y = Number(this.enemyWalkWay) - entity.height;
	  const index = this.getTimeIndex();
	  this.selectedEnemy = {
		enemy: entity,
		index: index,
		walkway: this.enemyWalkWay,
	  };
	  this.selectedWalkWay = null;
	  if (!this.dragObj.new) {
		this.deleteEnemy(this.dragObj.oldWW, index, this.dragObj.subindex);
	  }
	  this.selectedEnemy.subindex = this.addEnemy(this.enemyWalkWay, entity, index);
	  this.enemyWalkWay = null;
	  this.selectedProp = null;
	  break;
	}
	case "prop": {
	  if (Math.abs(this.dragObj.y - Number(this.enemyWalkWay)) < entity.height*1.5) {
		entity.y = Number(this.enemyWalkWay) - entity.height + Editor.WALKWAY_COVER_DISTANCE;
	  } else {
		entity.y = this.dragObj.y;
	  }
	  if (!this.dragObj.new) {
		this.deleteProp(this.dragObj.index);
	  }
	  const index = this.addProp(entity);
	  this.selectedEnemy = null;
	  this.enemyWalkWay = null;
	  this.selectedProp = {prop: entity, index: index};
	  break;
	}
	default: {
	  console.error("Unknown entity type", entity);
	}
	}
  }

  dropWP() {
	this.undoList.push(this.takeDataSnapshot());
	const enemy = this.levelData.walkways[this.dragWP.walkway][this.dragWP.index][this.dragWP.subindex];
	enemy.endX = this.dragWP.end.x + this.stageOffset;
	this.selectedEnemy = {
	  enemy: enemy,
	  walkway: this.dragWP.walkway,
	  index: this.dragWP.index,
	  subindex: this.dragWP.subindex
	};
	this.selectedWalkWay = null;
	this.selectedProp = null;
  }

  takeDataSnapshot() {
	// return deep copy of this.levelData
	const snapshot = {
	  name: Object.keys(this.levels)[this.currentLevelIdx],
	  props: (this.levelData.props || []).map(prop => {
		return {...prop};
	  }),
	  walkways: JSON.parse(JSON.stringify(this.levelData.walkways)),
	};
	console.log("Took data snapshot", snapshot);
	return snapshot;
  }

  * getEnemiesForTime() {
	const timeIndex = this.getTimeIndex();
	for (const walkway of Object.keys(this.levelData.walkways).sort()) {
	  const waves = this.levelData.walkways[walkway];
	  const wave = waves[timeIndex] || [];
	  for (const [i, enemySpec] of wave.entries()) {
		yield [i, walkway, enemySpec];
	  }
	}
  }

  drawEntity(entity, ctx, assets, groupIndex) {
	groupIndex = groupIndex || 0;
	const spec = entity.imageSpec;
	ctx.drawImage(
	  assets[spec.id],
	  spec.sx,
	  spec.sy,
	  spec.sWidth,
	  spec.sHeight,
	  Math.round(entity.x - this.stageOffset + groupIndex*entity.width),
	  Math.round(entity.y),
	  entity.width,
	  entity.height,
	);
  }

  draw(ctx, assets) {
	// TODO: draw stage wings
	const oldAlpha = ctx.globalAlpha;
	ctx.drawImage(assets.levelBG, this.stageOffset, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
	for (const walkway of Object.keys(this.levelData.walkways)) {
	  ctx.globalAlpha = 0.6;
	  if (walkway === this.enemyWalkWay) {
		ctx.fillStyle = "fuchsia";
	  } else if (walkway === this.selectedWalkWay) {
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = "lime";
	  } else {
		ctx.fillStyle = "indianred";
	  }
	  ctx.fillRect(0, Math.round(walkway) - 10, ctx.canvas.width, 10);
	  ctx.fillStyle = "white";
	  ctx.globalAlpha = 0.9;
	  const enemiesCount = this.levelData.walkways[walkway].flat().filter(e => e !== null).reduce((acc, e) => acc + (e.count || 1), 0);
	  ctx.fillText(enemiesCount.toString(), 2, Math.round(walkway) - 1);
	  ctx.globalAlpha = oldAlpha;
	}
	if (this.isAddingWalkWay && this.newWalkWay !== null) {
	  ctx.fillStyle = 'hotpink';
	  ctx.fillRect(0, Math.round(this.newWalkWay) - 10, ctx.canvas.width, 10);
	}
	for (const component of Object.values(this.components)) {
	  component.draw(ctx, assets);
	}
	for (const [i, walkway, enemy] of this.getEnemiesForTime()) {
	  const count = enemy.count || 1;
	  for (let i=0; i<count; i++) {
		this.drawEntity(enemy, ctx, assets, i);
	  }
	  // draw waypoint "handle"
	  const endY = enemy.y + enemy.height/2;
	  if (enemy.endX) {
		ctx.strokeStyle = "yellow";
		ctx.beginPath();
		ctx.moveTo(Math.round(enemy.x - this.stageOffset + (enemy.width*(enemy.count||1))/2), Math.round(enemy.y + enemy.height/2));
		ctx.lineTo(Math.round(enemy.endX - this.stageOffset), Math.round(endY));
		ctx.stroke();
		ctx.strokeStyle = "cyan";
		ctx.strokeRect(Math.round(enemy.endX - this.stageOffset - Editor.WP_HANDLE_SIZE/2), Math.round(endY - Editor.WP_HANDLE_SIZE/2), Editor.WP_HANDLE_SIZE, Editor.WP_HANDLE_SIZE);
	  } else {
		ctx.strokeRect(Math.round(enemy.x - this.stageOffset + enemy.width/2 - Editor.WP_HANDLE_SIZE/2), Math.round(endY - Editor.WP_HANDLE_SIZE/2), Editor.WP_HANDLE_SIZE, Editor.WP_HANDLE_SIZE);
	  }
	}
	const timeIndex = this.getTimeIndex();
	ctx.globalAlpha = 0.3;

	for (const enemy of this.simEnemies) {
	  this.drawEntity(enemy, ctx, assets);
	};
	ctx.globalAlpha = oldAlpha;
	for (const walkway of Object.keys(this.levelData.walkways).map(Number).sort((a, b) => a - b).map(ww => ww.toString())) {
	  for (const prop of this.levelData.props.filter(prop => prop.y < Number(walkway))) {
		this.drawEntity(prop, ctx, assets);
	  }
	}
	if (this.isDraggingWP) {
	  ctx.strokeStyle = "red";
	  ctx.beginPath();
	  ctx.moveTo(this.dragWP.start.x, this.dragWP.start.y);
	  ctx.lineTo(this.dragWP.end.x, this.dragWP.end.y);
	  ctx.stroke();
	}
	if (this.isDragging) {
	  ctx.fillStyle = this.dragObj.entity.color;
	  const oldAlpha = ctx.globalAlpha;
	  ctx.globalAlpha = 0.5;
	  this.drawEntity(this.dragObj.entity, ctx, assets);
	  ctx.globalAlpha = oldAlpha;
	}
	// draw buttons
	for (const [i, btn] of this.buttons.entries()) {
	  btn.draw(ctx, assets, this.components.timeSlider.y + TimeSlider.HEIGHT, i);
	}
	if (this.selectedEnemy !== null && timeIndex === this.selectedEnemy.index) {
	  ctx.setLineDash([2, 3]);
	  ctx.strokeStyle = "lime";
	  ctx.strokeRect(Math.round(this.selectedEnemy.enemy.x - this.stageOffset), Math.round(this.selectedEnemy.enemy.y), this.selectedEnemy.enemy.width*(this.selectedEnemy.enemy.count||1), this.selectedEnemy.enemy.height);
	  ctx.setLineDash([]);
	}
	if (this.selectedProp !== null) {
	  ctx.setLineDash([2, 3]);
	  ctx.strokeStyle = "lime";
	  ctx.strokeRect(Math.round(this.selectedProp.prop.x - this.stageOffset), Math.round(this.selectedProp.prop.y), this.selectedProp.prop.width, this.selectedProp.prop.height);
	  ctx.setLineDash([]);
	}
	if (this.isDragging) {
	  ctx.setLineDash([2, 3]);
	  ctx.strokeStyle = "pink";
	  ctx.strokeRect(Math.round(this.dragObj.x - this.stageOffset), Math.round(this.dragObj.y), this.dragObj.width*(this.dragObj.entity.count||1), this.dragObj.height);
	  ctx.setLineDash([]);
	}
	if (this.isDraggingWW) {
	  ctx.globalAlpha = 0.8;
	  ctx.fillStyle = "lime";
	  ctx.fillRect(0, Math.round(this.dragWW.y) - 10, ctx.canvas.width, 10);
	  ctx.globalAlpha = oldAlpha;
	}
  }

  blast(ctx, assets) {
  }

  toggle() {
	this.enabled = !this.enabled;
	if (this.enabled) {
	  this.updateSimEnemies(this.components.timeSlider.sliderPos);
	  this.hooks.edit(this.levelData);
	} else {
	  this.hooks.play(this.takeDataSnapshot());
	}
  }

  exit() {
	this.hooks.exit();
  }

  deleteEnemy(walkway, index, subindex) {
	if (Array.isArray(this.levelData.walkways[walkway][index])) {
	  this.levelData.walkways[walkway][index].splice(subindex, 1);
	}
  }

  deleteSelected() {
	if (this.selectedEnemy !== null && this.getTimeIndex() === this.selectedEnemy.index) {
	  this.undoList.push(this.takeDataSnapshot());
	  // TODO: find walkway
	  this.deleteEnemy(this.selectedEnemy.walkway, this.selectedEnemy.index, this.selectedEnemy.subindex);
	  this.selectedEnemy = null;
	  console.log("DATA UPDATED", this.levelData, this.undoList);
	} else if (this.selectedProp !== null) {
	  this.undoList.push(this.takeDataSnapshot());
	  this.deleteProp(this.selectedProp.index);
	  this.selectedProp = null;
	} else if (this.selectedWalkWay !== null) {
	  this.undoList.push(this.takeDataSnapshot());
	  delete this.levelData.walkways[this.selectedWalkWay];
	  this.selectedWalkWay = null;
	}
  }

  undo() {
	// TODO: handle simEnemies
	if (this.undoList.length) {
	  const snapshot = this.undoList.pop();
	  this.levelData = snapshot;
	  this.selectedEnemy = null;
	  this.selectedWalkWay = null;
	} else {
	  console.log("No further undo information");
	}
  }

  chainSelected() {
	if (this.selectedEnemy !== null && this.getTimeIndex() === this.selectedEnemy.index) {
	  const walkway = this.selectedEnemy.walkway;
	  const wave = this.selectedEnemy.index;
	  const subindex = this.selectedEnemy.subindex;
	  this.undoList.push(this.takeDataSnapshot());
	  const enemySpec = this.levelData.walkways[walkway][wave][subindex];
	  enemySpec.count = (enemySpec.count || 1) + 1;
	}
  }

  async save() {	// TODO: lock editor during save
	const newHandle = await window.showSaveFilePicker({suggestedName: `${Object.keys(this.levels)[this.currentLevelIdx]}.json`});
	const writableStream = await newHandle.createWritable();
	const data = JSON.stringify(this.takeDataSnapshot(), null, 2);
	const blob = new Blob([data], {type: "application/json"});
	await writableStream.write(blob);
	await writableStream.close();
	return data;
  }

  addWalkWay() {
	if (!this.isAddingWalkWay) {
	  this.isAddingWalkWay = true;
	  this.newWalkWay = null;
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

  updateSliderPos(pos) {
	this.sliderPos = pos;
	console.log("Changed time slider position", this.sliderPos, "TIME:", this.getSelectedTime());
	this.editor.updateSimEnemies(this.sliderPos);
  }

  stepLeft() {
	this.updateSliderPos(Math.max(0, this.sliderPos - 1));
  }

  stepRight() {
	this.updateSliderPos(Math.min(this.maxPos, this.sliderPos + 1));
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
	  this.updateSliderPos(this.screenPosToSliderPos(input.mousePos.x));
	  this.isDragging = true;
	} else if (!input.mouseButtonHeld && this.isDragging) {
	  this.isDragging = false;
	  this.updateSliderPos(this.screenPosToSliderPos(input.mousePos.x));
	}
  }

  draw(ctx, assets) {
	this.leftBtn.draw(ctx, assets);
	for (let i=TimeSlider.BTN_WIDTH; i<ctx.canvas.width - TimeSlider.BTN_WIDTH; i+=2) {
	  ctx.drawImage(assets.editorUI, 81, 20, 2, TimeSlider.HEIGHT, i, this.y, 2, TimeSlider.HEIGHT);
	}
	this.rightBtn.draw(ctx, assets);
	ctx.fillStyle = "red";
	for (const waves of Object.values(this.editor.levelData.walkways)) {
	  for (const [i, wave] of waves.entries()) {
		if ((wave || []).length) {
		  ctx.fillRect(Math.floor(i*2) + TimeSlider.BTN_WIDTH, this.y + 2, 1, 6);
		}
	  }
	}
	ctx.fillStyle = "yellow";
	ctx.fillRect(Math.floor(this.sliderPos*2) + TimeSlider.BTN_WIDTH, this.y + 2, 1, 6);
  }
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
	  {type: "enemy", name: "RASPBERRY_DONUT", width: 32, height: 32, imageSpec: {
		id: "donutSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32}
	  },
	  {type: "enemy", name: "CHOCO_DONUT", width: 32, height: 32, imageSpec: {
		id: "donutSheet", sx: 0, sy: 32, sWidth: 32, sHeight: 32}
	  },
	  {type: "enemy", name: "FROSTED_DONUT", width: 32, height: 32, imageSpec: {
		id: "donutSheet", sx: 0, sy: 64, sWidth: 32, sHeight: 32
	  }},
	  {type: "enemy", name: "ESPRESSO", width: 45, height: 32, imageSpec: {
		id: "expressoGangsterSheet", sx: 0, sy: 0, sWidth: 45, sHeight: 32}
	  },
	  {type: "enemy", name: "EVIL_PRINTER", width: 32, height: 32, imageSpec: {
		id: "printerSheet", sx: 0, sy: 0, sWidth: 32, sHeight: 32
	  }},
	];
	const enemyBoxX = this.containerX + EnemyPalette.margin;
	this.boxes = this.enemies.map((enemy, i) => ({
	  x: this.x + 10 + i*EnemyPalette.boxSize,
	  y: this.y + EnemyPalette.margin,
	  width: EnemyPalette.boxSize - EnemyPalette.margin*2,
	  height: EnemyPalette.boxSize - EnemyPalette.margin*2,
	  entity: enemy,
	}));
	this.width = EnemyPalette.boxSize*this.boxes.length + EnemyPalette.scrollBtnWidth*2;
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
	ctx.fillRect(this.x + EnemyPalette.scrollBtnWidth, this.y, EnemyPalette.boxSize*this.boxes.length, EnemyPalette.boxSize);
	for (const [i, box] of this.boxes.entries()) {
	  const offset = i*EnemyPalette.boxSize;
	  ctx.drawImage(assets.editorUI, 71, 0, 3, EnemyPalette.boxSize, this.x + EnemyPalette.scrollBtnWidth + offset, this.y, 3, EnemyPalette.boxSize);
	  const spec = box.entity.imageSpec;
	  ctx.drawImage(assets[spec.id], spec.sx, spec.sy, spec.sWidth, spec.sHeight, Math.round(box.x), Math.round(box.y), box.width, box.height);
	  ctx.drawImage(assets.editorUI, 68, 0, 3, EnemyPalette.boxSize, this.x + EnemyPalette.scrollBtnWidth + (i+1)*EnemyPalette.boxSize - 3, this.y, 3, EnemyPalette.boxSize);
	}	
	// draw right scroll button
	ctx.translate(this.x + EnemyPalette.scrollBtnWidth*2 + EnemyPalette.boxSize*this.boxes.length, this.y);
	ctx.scale(-1, 1);
	ctx.drawImage(assets.editorUI, 85, 0, 6, 32, 0, 0, 6, 32);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}


class PropPalette {
  static margin = 4;
  static boxSize = 32;
  static scrollBtnWidth = 6;

  constructor(editor, x, y) {
	this.editor = editor;
	this.x = x;
	this.y = y;
	this.containerX = 426*2 - 32;
	this.height = 240 - 24;
	this.props = [
	  {type: "prop", name: "GRAVE_1", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 0, sy: 0, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "GRAVE_2", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 32, sy: 0, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "GRAVE_3", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 64, sy: 0, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "BUSH_1", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 0, sy: 32, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "BUSH_2", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 32, sy: 32, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "BUSH_3", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 64, sy: 32, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "ROCK_1", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 0, sy: 64, sWidth: 32, sHeight: 32}
	  },
	  {type: "prop", name: "ROCK_2", width: 32, height: 32, imageSpec: {
		id: "graveyardProps", sx: 32, sy: 64, sWidth: 32, sHeight: 32}
	  },
	];
	const propBoxX = this.containerX + PropPalette.margin;
	this.boxes = this.props.map((prop, i) => ({
	  x: this.x + 10 + i*PropPalette.boxSize,
	  y: this.y + PropPalette.margin,
	  width: PropPalette.boxSize - PropPalette.margin*2,
	  height: PropPalette.boxSize - PropPalette.margin*2,
	  entity: prop,
	}));
	this.width = PropPalette.boxSize*this.boxes.length + PropPalette.scrollBtnWidth*2;
  }

  update(dt, input) {
  }

  draw(ctx, assets) {
	// draw left scroll button
	ctx.drawImage(assets.editorUI, 85, 0, PropPalette.scrollBtnWidth, 32, this.x, this.y, PropPalette.scrollBtnWidth, 32);
	// draw prop palette
	ctx.fillStyle = "black";
	ctx.fillRect(this.x + PropPalette.scrollBtnWidth, this.y, PropPalette.boxSize*this.boxes.length, PropPalette.boxSize);
	for (const [i, box] of this.boxes.entries()) {
	  const offset = i*PropPalette.boxSize;
	  ctx.drawImage(assets.editorUI, 71, 0, 3, PropPalette.boxSize, this.x + PropPalette.scrollBtnWidth + offset, this.y, 3, PropPalette.boxSize);
	  const spec = box.entity.imageSpec;
	  ctx.drawImage(assets[spec.id], spec.sx, spec.sy, spec.sWidth, spec.sHeight, Math.round(box.x), Math.round(box.y), box.width, box.height);
	  ctx.drawImage(assets.editorUI, 68, 0, 3, PropPalette.boxSize, this.x + PropPalette.scrollBtnWidth + (i+1)*PropPalette.boxSize - 3, this.y, 3, PropPalette.boxSize);
	}
	// draw right scroll button
	ctx.translate(this.x + PropPalette.scrollBtnWidth*2 + PropPalette.boxSize*this.boxes.length, this.y);
	ctx.scale(-1, 1);
	ctx.drawImage(assets.editorUI, 85, 0, 6, 32, 0, 0, 6, 32);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
