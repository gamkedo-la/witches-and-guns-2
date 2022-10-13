import {Input} from "./input.js";
import {Player} from "./player.js";
import {Level} from "./level.js";
import {BossFight} from "./bossfight.js";
import {Editor} from "./editor.js";
import {loadAssets} from "./assets.js";
import {constants} from "./constants.js";

class Game {
  static dt = 0;
  static updateStep = 1/60;
  static last = window.performance && window.performance.now ? window.performance.now() : new Date().getTime();

  constructor(loadedAssets, audioCtx) {
	const canvas = document.getElementById("gameCanvas");
	this.ctx = canvas.getContext("2d");
	this.audioCtx = audioCtx;
	this.assets = loadedAssets;
	this.input = new Input(canvas);
	this.editor = new Editor(loadedAssets.levels, {
	  play: levelData => this.scene = new PlayTestScene(new Player({x: 100, y: constants.VIEWABLE_HEIGHT - Player.avatarHeight}, Player.player2ImageSpec), levelData, this.editor),
	  edit: levelData => this.scene = this.editor,
	  exit: () => this.scene = this.menu,
	});
	const creditsScene = new CreditsScene({exit: () => this.scene = this.menu});
	this.menu = new MenuScene({
	  play: () => this.scene = new GamePlayScene(this, this.assets.levels),
	  editor: () => this.scene = this.editor,
	  credits: () => this.scene = creditsScene,
	});
	this.scene = this.menu;
  }

  start() {
	window.requestAnimationFrame(this.getAnimationFrameCallback());
  }

  update(dt) {
	this.scene.update(dt, this.input);
	this.input.justReleasedKeys.clear();
  }

  draw() {
	this.ctx.fillStyle = this.editor.enabled ? "green" : "gray";
	this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

	this.scene.draw(this.ctx, this.assets.images);

	if (this.input.pause && this.scene.canPause) {
	  const oldAlign = this.ctx.textAlign;
	  const oldFont = this.ctx.oldFont;
	  this.ctx.fillStyle = "white";
	  this.ctx.font = "bold 18px sans";
	  this.ctx.textAlign = "center";
	  this.ctx.fillText("PAUSED", Math.round(this.ctx.canvas.width/2), Math.round(this.ctx.canvas.height/2));
	  this.ctx.textAlign = oldAlign;
	  this.ctx.font = oldFont;
	}
  }

  blast() {
	this.scene.blast(this.audioCtx, this.assets.sounds);
  }

  getAnimationFrameCallback() {
	const game = this;
	const runGameStep = function(browserTimeStamp) {
	  Game.dt += Math.min(1, (browserTimeStamp - Game.last) / 1000);
	  while (Game.dt > Game.updateStep) {
		Game.dt -= Game.updateStep;
		game.update(Game.updateStep);
		game.blast();
	  }
	  game.draw();
	  Game.last = browserTimeStamp;
	  window.requestAnimationFrame(game.getAnimationFrameCallback());
	};
	return runGameStep;
  }
}

window.onload = function() {
  const audioCtx = new AudioContext();
  loadAssets(audioCtx).then(([images, sounds, levels]) => {
	const game = new Game({
	  images: Object.fromEntries(images),
	  sounds: Object.fromEntries(sounds),
	  levels: Object.fromEntries(levels),
	}, audioCtx);
	game.start();
  });
};


class MenuScene {
  constructor(options) {
	this.options = options;
	this.selectedIndex = 0;
  }

  update(dt, input) {
		const numOptions = Object.keys(this.options).length;
		if (input.justReleasedKeys.has("ArrowDown")) {
			this.selectedIndex++;
			this.selectedIndex = this.selectedIndex % numOptions;
		}
		if (input.justReleasedKeys.has("ArrowUp")) {
			this.selectedIndex--;
			if (this.selectedIndex < 0) {
			this.selectedIndex = numOptions + this.selectedIndex;
			} else {
			this.selectedIndex = this.selectedIndex % numOptions;
			}
		}
		if (input.justReleasedKeys.has("Enter")) {
			const option = Object.keys(this.options)[this.selectedIndex];
			this.options[option]();
		}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	const midX = Math.round(ctx.canvas.width/2);

    ctx.drawImage(assets.menuBG,-180+Math.cos(performance.now()/4000)*180,0);
    ctx.drawImage(assets.logo,midX-assets.logo.width/2,0);


    ctx.fillStyle = "orange";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	/*
    ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	ctx.fillText("INCREDIBLY WELL", midX, Math.round(ctx.canvas.height/4));
	ctx.fillText("PRODUCED LOGO", midX, Math.round(ctx.canvas.height/3));
    */
	ctx.font = "12px sans";
	ctx.textAlign = "left";
	for (const [i, label] of Object.keys(this.options).entries()) {
	  if (i == this.selectedIndex) {
		ctx.fillText("👉", midX - 48, Math.round(ctx.canvas.height*0.5 + 12*i));
	  }
	  ctx.fillText(label.toUpperCase(), midX - 24, Math.round(ctx.canvas.height*0.5 + 12*i));
	}

	ctx.font = "10px sans";
	ctx.fillText("- Left, Right: Move (Double tap to Dodge)", ctx.canvas.width * 0.1, ctx.canvas.height * 0.5 + 12 * (Object.keys(this.options).length + 1))
	ctx.fillText("- Spacebar: Shoot", ctx.canvas.width * 0.1, ctx.canvas.height * 0.5 + 12 * (Object.keys(this.options).length + 2))
	ctx.fillText("- Up, Down: Aim", ctx.canvas.width * 0.1, ctx.canvas.height * 0.5 + 12 * (Object.keys(this.options).length + 3))
	ctx.fillText("- p or Tab: Pause", ctx.canvas.width * 0.1, ctx.canvas.height * 0.5 + 12 * (Object.keys(this.options).length + 4))

	ctx.textAlign = oldAlign;
	ctx.font = oldFont;
  }

  blast(ctx, assets) {
  }
}


class LevelScene {
  constructor(player, levelData, parent) {
	this.player = player;
	this.parent = parent;
	this.loadLevel(levelData);
  }

  loadLevel(levelData) {
	this.level = new Level(levelData, constants.PLAYABLE_WIDTH, constants.VIEWABLE_HEIGHT, this.player);
	this.level.reset(levelData);
  }

  update(dt, input) {
	if (input.pause) {
	  return;
	}
	this.level.update(dt, input);
	if (this.level.finished) {
	  console.log("LEVEL FINISHED", this.level);
	  this.onFinishedLevel();
	  return;
	}
	this.player.update(dt, input, this.level);
	if (this.player.lives <= 0) {
	  this.onPlayerLost();
	}
  }

  draw(ctx, assets) {
	this.level.draw(ctx, assets);
	this.player.draw(ctx, assets, this.level.offset);
  }

  blast(ctx, assets) {
	this.level.blast(ctx, assets);
	this.player.blast(ctx, assets);
  }

  onFinishedLevel() {
	this.parent.bossFight();
  }

  onPlayerLost() {
	this.parent.gameOver();
  }
}


class BossFightScene extends LevelScene {
  loadLevel(levelData) {
	this.level = new BossFight(levelData, constants.PLAYABLE_WIDTH, constants.VIEWABLE_HEIGHT, this.player);
	this.level.reset(levelData);
	this.canPause = true;
  }

  onFinishedLevel() {
	this.canPause = false;
	this.parent.tallyUp();
  }
}


class TallyUpScene {
  constructor(parent, stats) {
	this.parent = parent;
	this.timer = 0;
	this.stats = Object.assign({}, stats);
  }

  update(dt, input) {
	this.timer += dt;
	if (this.timer > 3) {
	  this.parent.loadNextLevel();
	  return;
	}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "cyan";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("LEVEL FINISHED", midX, 24);
	ctx.textAlign = "left";
	ctx.font = "20px serif";
	ctx.fillText("KILLS", 12, 48);
	ctx.fillText("VANDALISM", 12, 64);
	ctx.fillText("ITEMS", 12, 80);

	ctx.textAlign = "right";
	const countersX = ctx.canvas.width - 16;
	ctx.fillText(this.stats.kills.toString(), countersX , 48);
	ctx.fillText(this.stats.vandalism.toString(), countersX, 64);
	ctx.fillText(this.stats.items.toString(), countersX, 80);
	ctx.textAlign = oldAlign;
	ctx.oldFont = oldFont;
  }

  blast(ctx, assets) {
  }
}

class PlayerSelectScene {
  constructor(parent) {
	this.parent = parent;
	this.selected = "left";
  }

  update(dt, input) {
	if (input.justReleasedKeys.has("ArrowRight") || input.justReleasedKeys.has("d")) {
	  this.selected = "right";
	}
	if (input.justReleasedKeys.has("ArrowLeft") || input.justReleasedKeys.has("a")) {
	  this.selected = "left";
	}
	if (input.justReleasedKeys.has("Enter")) {
	  const imageSpec = this.selected == "right" ? Player.player1ImageSpec : Player.player2ImageSpec;
	  this.parent.setPlayer(new Player({x: 100, y: constants.VIEWABLE_HEIGHT - Player.avatarHeight}, imageSpec));
	  this.parent.loadNextLevel();
	}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.globalAlpha = 0.1;
	ctx.drawImage(assets.menuBG, assets.menuBG.width - ctx.canvas.width, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);

	ctx.globalAlpha = this.selected == 'left' ? 1 : 0.4;
	ctx.drawImage(assets.player1, 0, 0, 50, 48, (ctx.canvas.width - 50*2)/4, (ctx.canvas.height - 48*2)/2, 50*2, 48*2);
	ctx.globalAlpha = this.selected == 'right' ? 1 : 0.4;
	ctx.drawImage(assets.player2, 65, 0, 35, 49, 3*(ctx.canvas.width - 35*2)/4, (ctx.canvas.height - 49*2)/2, 35*2, 49*2);

    ctx.globalAlpha = 1;
  }

  blast(ctx, assets) {
  }
}

class GamePlayScene {
  constructor(game, levels) {
	this.game = game;
	this.levels = levels;
	this.nextLevelIdx = 0;
	this.playerSelect();
  }

  setPlayer(player) {
	this.player = player;
  }

  playerSelect() {
	this.subscene = new PlayerSelectScene(this);
  }

  bossFight() {
	this.canPause = false;
	this.subscene = new BossFightScene(this.player, this.subscene.level.levelData, this);
	console.log("BOSS FIGHT", this.subscene);
	this.canPause = true;
  }

  tallyUp() {
	this.canPause = false;
	this.subscene = new TallyUpScene(this, this.player.levelStats);
  }

  gameOver() {
	this.canPause = false;
	this.subscene = new GameOverScene({exit: () => this.game.scene = this.game.menu});
  }

  loadNextLevel() {
	this.canPause = false;
	if (this.nextLevelIdx >= Object.keys(this.levels).length) {
	  this.subscene = new GameFinishedScene(this);
	} else {
	  const levelId = Object.keys(this.levels)[this.nextLevelIdx];
	  this.player.resetLevelStats();
	  this.subscene = new LevelScene(this.player, this.levels[levelId], this);
	  this.canPause = true;
	  this.nextLevelIdx = (this.nextLevelIdx + 1); // % Object.keys(this.levels).length;
	}
  }

  rollCredits() {
	this.canPause = false;
	this.subscene = new CreditsScene({exit: () => this.gameOver()});
  }

  update(dt, input) {
	this.subscene.update(dt, input);
  }

  draw(ctx, assets) {
	this.subscene.draw(ctx, assets);
  }

  blast(ctx, assets) {
	this.subscene.blast(ctx, assets);
  }
}


class GameFinishedScene {
  constructor(parent) {
	this.parent = parent;
	this.timer = 0;
  }

  update(dt, input) {
	this.timer += dt;
	if (this.timer > 6) {
	  this.parent.rollCredits();
	  return;
	}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "pink";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("YOU DID IT!", midX, Math.round(ctx.canvas.height/2) - 50);
	ctx.textAlign = "left";
	ctx.font = "16px sans";
	ctx.fillText("THANKS FOR DEFEATING THE EVIL WITCH.", 10, Math.round(ctx.canvas.height/2));
	ctx.fillText("LET'S GO FOR A BURGER....", 10, Math.round(ctx.canvas.height/2) + 20);
	ctx.fillText("HA! HA! HA! HA!", 10, Math.round(ctx.canvas.height/2) + 40);
	ctx.textAlign = oldAlign;
	ctx.oldFont = oldFont;
  }

  blast(ctx, assets) {
  }
}

class PlayTestScene extends LevelScene {
  constructor(player, levelData, editor) {
	super(player, levelData, editor);
	this.level.disableLevelTimer();
  }

  update(dt, input) {
	if (input.justReleasedKeys.has(Input.EDIT)) {
	  this.exit();
	  return;
	}
	super.update(dt, input);
  }

  exit() {
	this.parent.toggle();
  }

  onPlayerLost() {
	this.player.lives = 10;
  }
}


class CreditsScene {
  constructor(hooks) {
		this.hooks = hooks;
		this.elapsedTime = 0;
		this.lineHeight = 18;
		this.scrollPaused = false;
		this.contributorFont = `bold ${this.lineHeight}px serif`;
		this.contributionsFont = `normal ${this.lineHeight}px serif`;
		this.credits = [
			{
				contributor: 'Gonzalo',
				contributions: 'Game Lead, etc...'
			},
			{
				contributor: 'Someone Else',
				contributions: 'Some great stuff...lnbvfghj kjhg fr eswxcfred scvgbhjk,mn jhgfdsdf ghj kiuyg fdghj kiuytr esdfghjkiu y t rdfghj kiuy'
			}
		]
  }

  exit() {
		this.elapsedTime = 0;
		this.hooks.exit();
  }

  update(dt, input) {
		if (input.justReleasedKeys.has("Escape")) {
			this.exit();
		} else if (input.justReleasedKeys.has("ArrowDown")) {
			this.scrollPaused = true;
			this.elapsedTime -= 0.50;
		} else if (input.justReleasedKeys.has("ArrowUp")) {
			this.scrollPaused = true;
			this.elapsedTime += 0.50;
		} else if (input.justReleasedKeys.has(" ")) {
			this.scrollPaused = !this.scrollPaused;
		} else if (!this.scrollPaused) {
			this.elapsedTime += dt;
		}
  }

  draw(ctx, assets) {
		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.fillStyle = "orange";
		ctx.textAlign = "center";
		const midX = Math.round(ctx.canvas.width/2);
		const baseY = Math.round(ctx.canvas.height/3) - this.lineHeight * this.elapsedTime;
		let totalLines = 0;
		for (let i = 0; i < this.credits.length; i++) {
			ctx.font = this.contributorFont;
			let contributorY = baseY + (this.lineHeight * totalLines);

			if (contributorY > ctx.canvas.height) break

			if (contributorY > 0) ctx.fillText(this.credits[i].contributor, midX, Math.round(contributorY));
			totalLines++
			const wrappedContributions = this.performWordWrap(this.credits[i].contributions);
			ctx.font = this.contributionsFont;
			for (const contribution of wrappedContributions) {
				const contributionY = Math.round(baseY + (this.lineHeight * totalLines));

				if (contributionY > ctx.canvas.height) break

				if (contributionY > 0) ctx.fillText(contribution, midX, contributionY);
				totalLines++;
			}

			totalLines++;
		}
		ctx.restore();
  }

	performWordWrap (inputString) {
		const lineLength = 50;
		if (inputString.length < lineLength) return [inputString];
		const results = []
		let remainingString = inputString;
		while (remainingString.length > lineLength) {
			const lastSpace = remainingString.substring(0, lineLength).lastIndexOf(' ');
			results.push(remainingString.substring(0, lastSpace));
			remainingString = remainingString.substring(lastSpace);
		}

		results.push(remainingString);

		return results;
	}

  blast(ctx, assets) {
  }
}

class GameOverScene {
  constructor(hooks) {
	this.hooks = hooks;
	this.timer = 0;
  }

  exit() {
	this.hooks.exit();
  }

  update(dt, input) {
	this.timer += dt;
	if (this.timer > 4) {
	  this.exit();
	}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "firebrick";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "lightyellow";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("GAME", midX, Math.round(ctx.canvas.height/3));
	ctx.fillText("OVER", midX, Math.round(ctx.canvas.height/2));
  }

  blast(ctx, assets) {
  }
}
