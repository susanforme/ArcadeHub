/* Hextris by Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang.
 * GPL-3.0-or-later. Source commit 3f4847dc8fd7dab3d1c87e6324b9159d92fbd396.
 * Adapted: instance-local state, platform timing/input/save, no DOM/network/storage.
 * Original block geometry, wave patterns, collision and scoring are retained.
 */
import { isHexSnapshot } from '../state';

export function createEngine(ctx, saved, random = Math.random) {
  const trueCanvas = { width: 800, height: 800 };
  const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
  const hexColorsToTintedColors = Object.fromEntries(colors.map(c => [c, c]));
  const rgbColorsToTintedColors = {};
  const angularVelocityConst = 4;
  const settings = { platform: 'nonmobile', startDist: 340, creationDt: 9,
    scale: 1, prevScale: 1, hexWidth: 87, blockHeight: 20, rows: 8,
    speedModifier: 0.65, creationSpeedModifier: 0.65, comboTime: 310 };
  let score = 0, gdx = 0, gdy = 0;
  const gameState = 1;
  let MainHex, waveone, blocks = [];
// Upstream math.js
function rotatePoint(x, y, theta) {
	var thetaRad = theta * (Math.PI / 180);
	var rotX = Math.cos(thetaRad) * x - Math.sin(thetaRad) * y;
	var rotY = Math.sin(thetaRad) * x + Math.cos(thetaRad) * y;

	return {
		x: rotX,
		y: rotY
	};
}

function randInt(min, max) {
	return Math.floor((random() * max) + min);
}

// Upstream Hex.js
function Hex(sideLength) {
	this.playThrough = 0;
	this.fillColor = [44,62,80];
	this.tempColor = [44,62,80];
	this.angularVelocity = 0;
	this.position = 0;
	this.dy = 0;
	this.dt = 1;
	this.sides = 6;
	this.blocks = [];
	this.angle = 180 / this.sides;
	this.targetAngle = this.angle;
	this.shakes = [];
	this.sideLength = sideLength;
	this.strokeColor = 'blue';
	this.x = trueCanvas.width / 2;
	this.y = trueCanvas.height / 2;
	this.ct = 0;
	this.lastCombo = this.ct - settings.comboTime;
	this.lastColorScored = "#000";
	this.comboTime = 1;
	this.texts = [];
		this.lastRotate = -1000;
	for (var i = 0; i < this.sides; i++) {
		this.blocks.push([]);
	}

	this.shake = function(obj) { //lane as in particle lane
		var angle = 30 + obj.lane * 60;
		angle *= Math.PI / 180;
		var dx = Math.cos(angle) * obj.magnitude;
		var dy = Math.sin(angle) * obj.magnitude;
		gdx -= dx;
		gdy += dy;
		obj.magnitude /= 2 * (this.dt+0.5);
		if (obj.magnitude < 1) {
			for (var i = 0; i < this.shakes.length; i++) {
				if (this.shakes[i] == obj) {
					this.shakes.splice(i, 1);
				}
			}
		}
	};

	this.addBlock = function(block) {
		if (!(gameState == 1 || gameState === 0)) return;
		block.settled = 1;
		block.tint = 0.6;
		var lane = this.sides - block.fallingLane;// -this.position;
		this.shakes.push({lane:block.fallingLane, magnitude:4.5 * 1 * (settings.scale)});
		lane += this.position;
		lane = (lane + this.sides) % this.sides;
		block.distFromHex = MainHex.sideLength / 2 * Math.sqrt(3) + block.height * this.blocks[lane].length;
		this.blocks[lane].push(block);
		block.attachedLane = lane;
		block.checked = 1;
	};

	this.doesBlockCollide = function(block, position, tArr) {
		if (block.settled) {
			return;
		}

		if (position !== undefined) {
			arr = tArr;
			if (position <= 0) {
				if (block.distFromHex - block.iter * this.dt * settings.scale - (this.sideLength / 2) * Math.sqrt(3) <= 0) {
					block.distFromHex = (this.sideLength / 2) * Math.sqrt(3);
					block.settled = 1;
					block.checked = 1;
				} else {
					block.settled = 0;
					block.iter = 1.5 + (waveone.difficulty/15) * 3;
				}
			} else {
				if (arr[position - 1].settled && block.distFromHex - block.iter * this.dt * settings.scale - arr[position - 1].distFromHex - arr[position - 1].height <= 0) {
					block.distFromHex = arr[position - 1].distFromHex + arr[position - 1].height;
					block.settled = 1;
					block.checked = 1;
				}
				else {
					block.settled = 0;
					block.iter = 1.5 + (waveone.difficulty/15) * 3;
				}
			}
		} else {
			var lane = this.sides - block.fallingLane;//  -this.position;
			lane += this.position;

			lane = (lane+this.sides) % this.sides;
			var arr = this.blocks[lane];

			if (arr.length > 0) {
				if (block.distFromHex + block.iter * this.dt * settings.scale - arr[arr.length - 1].distFromHex - arr[arr.length - 1].height <= 0) {
					block.distFromHex = arr[arr.length - 1].distFromHex + arr[arr.length - 1].height;
					this.addBlock(block);
				}
			} else {
				if (block.distFromHex + block.iter * this.dt * settings.scale - (this.sideLength / 2) * Math.sqrt(3) <= 0) {
					block.distFromHex = (this.sideLength / 2) * Math.sqrt(3);
					this.addBlock(block);
				}
			}
		}
	};

	this.rotate = function(steps) {
				if (this.ct * 16.666667 - this.lastRotate < 75) return;
		if (!(gameState === 1 || gameState === 0)) return;
		this.position += steps;

		while (this.position < 0) {
			this.position += 6;
		}

		this.position = this.position % this.sides;
		this.blocks.forEach(function(blocks) {
			blocks.forEach(function(block) {
				block.targetAngle = block.targetAngle - steps * 60;
			});
		});

		this.targetAngle = this.targetAngle - steps * 60;
				this.lastRotate = this.ct * 16.666667;
	};

	this.draw = function() {
		this.x = trueCanvas.width/2;

		if (gameState != -2) {
			this.y = trueCanvas.height/2;
		}
		this.sideLength = settings.hexWidth;
		gdx = 0;
		gdy = 0;
		for (var i = 0; i < this.shakes.length; i++) {
			this.shake(this.shakes[i]);
		}
		if (this.angle > this.targetAngle) {
			this.angularVelocity -= angularVelocityConst * this.dt;
		}
		else if(this.angle < this.targetAngle) {
			this.angularVelocity += angularVelocityConst * this.dt;
		}

		if (MainHex.dt > 0 && Math.abs(this.angle - this.targetAngle + this.angularVelocity) <= Math.abs(this.angularVelocity)) { //do better soon
			this.angle = this.targetAngle;
			this.angularVelocity = 0;
		}
		else {
			this.angle += MainHex.dt > 0 ? this.angularVelocity : 0;
		}

		drawPolygon(this.x + gdx, this.y + gdy + this.dy, this.sides, this.sideLength, this.angle,arrayToColor(this.fillColor) , 0, 'rgba(0,0,0,0)');
	};
}

function arrayToColor(arr){
	return 'rgb(' + arr[0]+ ','+arr[1]+','+arr[2]+')';
}

// Upstream Block.js
function Block(fallingLane, color, iter, distFromHex, settled) {
	// whether or not a block is rested on the center hex or another block
	this.settled = (settled === undefined) ? 0 : 1;
	this.height = settings.blockHeight;
	//the lane which the block was shot from
	this.fallingLane = fallingLane;

		this.checked=0;
	//the angle at which the block falls
	this.angle = 90 - (30 + 60 * fallingLane);
	//for calculating the rotation of blocks attached to the center hex
	this.angularVelocity = 0;
	this.targetAngle = this.angle;
	this.color = color;
	//blocks that are slated to be deleted after a valid score has happened
	this.deleted = 0;
	//blocks slated to be removed from falling and added to the hex
	this.removed = 0;
	//value for the opacity of the white blcok drawn over falling block to give it the glow as it attaches to the hex
	this.tint = 0;
	//value used for deletion animation
	this.opacity = 1;
	//boolean for when the block is expanding
	this.initializing = 1;
	this.ict = MainHex.ct;
	//speed of block
	this.iter = iter;
	//number of iterations before starting to drop
	this.initLen = settings.creationDt;
	//side which block is attached too
	this.attachedLane = 0;
	//distance from center hex
	this.distFromHex = distFromHex || settings.startDist * settings.scale ;

	this.incrementOpacity = function() {
		if (MainHex.dt === 0) return;
		if (this.deleted) {
			//add shakes
			if (this.opacity >= 0.925) {
				var tLane = this.attachedLane - MainHex.position;
				tLane = MainHex.sides - tLane;
				while (tLane < 0) {
					tLane += MainHex.sides;
				}

				tLane %= MainHex.sides;
				MainHex.shakes.push({lane:tLane, magnitude:3 * 1 * (settings.scale)});
			}
			//fade out the opacity
			this.opacity = this.opacity - 0.075 * MainHex.dt;
			if (this.opacity <= 0) {
				//slate for final deletion
				this.opacity = 0;
				this.deleted = 2;
				if (gameState == 1 || gameState==0) {
					// Persistence is owned by SessionScene.
				}
			}
		}
	};

	this.getIndex = function (){
		//get the index of the block in its stack
		var parentArr = MainHex.blocks[this.attachedLane];
		for (var i = 0; i < parentArr.length; i++) {
			if (parentArr[i] == this) {
				return i;
			}
		}
	};

	this.draw = function(attached, index) {
		this.height = settings.blockHeight;
		if (Math.abs(settings.scale - settings.prevScale) > 0.000000001) {
			this.distFromHex *= (settings.scale/settings.prevScale);
		}

		this.incrementOpacity();
		if(attached === undefined)
			attached = false;

		if(this.angle > this.targetAngle) {
			this.angularVelocity -= angularVelocityConst * MainHex.dt;
		}
		else if(this.angle < this.targetAngle) {
			this.angularVelocity += angularVelocityConst * MainHex.dt;
		}

		if (MainHex.dt > 0 && Math.abs(this.angle - this.targetAngle + this.angularVelocity) <= Math.abs(this.angularVelocity)) { //do better soon
			this.angle = this.targetAngle;
			this.angularVelocity = 0;
		}
		else {
			this.angle += MainHex.dt > 0 ? this.angularVelocity : 0;
		}

		this.width = 2 * this.distFromHex / Math.sqrt(3);
		this.widthWide = 2 * (this.distFromHex + this.height) / Math.sqrt(3);
		//this.widthWide = this.width + this.height + 3;
		var p1;
		var p2;
		var p3;
		var p4;
		if (this.initializing) {
			var rat = ((MainHex.ct - this.ict)/this.initLen);
			if (rat > 1) {
				rat = 1;
			}
			p1 = rotatePoint((-this.width / 2) * rat, this.height / 2, this.angle);
			p2 = rotatePoint((this.width / 2) * rat, this.height / 2, this.angle);
			p3 = rotatePoint((this.widthWide / 2) * rat, -this.height / 2, this.angle);
			p4 = rotatePoint((-this.widthWide / 2) * rat, -this.height / 2, this.angle);
		if (MainHex.dt > 0 && (MainHex.ct - this.ict) >= this.initLen) {
				this.initializing = 0;
			}
		} else {
			p1 = rotatePoint(-this.width / 2, this.height / 2, this.angle);
			p2 = rotatePoint(this.width / 2, this.height / 2, this.angle);
			p3 = rotatePoint(this.widthWide / 2, -this.height / 2, this.angle);
			p4 = rotatePoint(-this.widthWide / 2, -this.height / 2, this.angle);
		}

		if (this.deleted) {
			ctx.fillStyle = "#FFF";
		} else if (gameState === 0) {
			if (this.color.charAt(0) == 'r') {
				ctx.fillStyle = rgbColorsToTintedColors[this.color];
			}
			else {
				ctx.fillStyle = hexColorsToTintedColors[this.color];
			}
		}
		else {
			ctx.fillStyle = this.color;
		}

		ctx.globalAlpha = this.opacity;
		var baseX = trueCanvas.width / 2 + Math.sin((this.angle) * (Math.PI / 180)) * (this.distFromHex + this.height / 2) + gdx;
		var baseY = trueCanvas.height / 2 - Math.cos((this.angle) * (Math.PI / 180)) * (this.distFromHex + this.height / 2) + gdy;
		ctx.beginPath();
		ctx.moveTo(baseX + p1.x, baseY + p1.y);
		ctx.lineTo(baseX + p2.x, baseY + p2.y);
		ctx.lineTo(baseX + p3.x, baseY + p3.y);
		ctx.lineTo(baseX + p4.x, baseY + p4.y);
		//ctx.lineTo(baseX + p1.x, baseY + p1.y);
		ctx.closePath();
		ctx.fill();

		if (this.tint) {
			if (MainHex.dt > 0 && this.opacity < 1) {
				if (gameState == 1 || gameState==0) {
					// Persistence is owned by SessionScene.
				}

				this.iter = 2.25;
				this.tint = 0;
			}

			ctx.fillStyle = "#FFF";
			ctx.globalAlpha = this.tint;
			ctx.beginPath();
			ctx.moveTo(baseX + p1.x, baseY + p1.y);
			ctx.lineTo(baseX + p2.x, baseY + p2.y);
			ctx.lineTo(baseX + p3.x, baseY + p3.y);
			ctx.lineTo(baseX + p4.x, baseY + p4.y);
			ctx.lineTo(baseX + p1.x, baseY + p1.y);
			ctx.closePath();
			ctx.fill();
			this.tint -= 0.02 * MainHex.dt;
			if (this.tint < 0) {
				this.tint = 0;
			}
		}

		ctx.globalAlpha = 1;
	};
}

function findCenterOfBlocks(arr) {
	var avgDFH = 0;
	var avgAngle = 0;
	for (var i = 0; i < arr.length; i++) {
		avgDFH += arr[i].distFromHex;
		var ang = arr[i].angle;
		while (ang < 0) {
			ang += 360;
		}

		avgAngle += ang % 360;
	}

	avgDFH /= arr.length;
	avgAngle /= arr.length;

	return {
		x:trueCanvas.width/2 + Math.cos(avgAngle * (Math.PI / 180)) * avgDFH,
		y:trueCanvas.height/2 + Math.sin(avgAngle * (Math.PI / 180)) * avgDFH
	};
}

// Upstream Text.js
function Text(x,y,text,font,color,incrementFunction){
	this.x = x;
	this.y = y;
	this.font = font;
	this.color = color;
	this.opacity =1;
	this.text = text;
	this.alive=1;
	this.draw = function(){
		if (this.alive>0) {
			ctx.globalAlpha = this.opacity;
			renderText((this.x + gdx), (this.y + gdy),50,this.color,this.text);
			ctx.globalAlpha =1;
			incrementFunction(this);
			return true;
		}
		else {
			return false;
		}
	};
}

function fadeUpAndOut(text){
	text.opacity -= MainHex.dt * Math.pow(Math.pow((1-text.opacity), 1/3)+1,3)/100;
	text.alive = text.opacity;
	text.y -= 3 * MainHex.dt;
}

// Upstream checking.js
function search(twoD,oneD){
	// Searches a two dimensional array to see if it contains a one dimensional array. indexOf doesn't work in this case
	for(var i=0;i<twoD.length;i++){
		if(twoD[i][0] == oneD[0] && twoD[i][1] == oneD[1]) {
			return true;
		}
	}
	return false;
}

function floodFill(hex, side, index, deleting) {
	if (hex.blocks[side] === undefined || hex.blocks[side][index] === undefined) return;

	//store the color
	var color = hex.blocks[side][index].color;
	//nested for loops for navigating the blocks
	for(var x =-1;x<2;x++){
		for(var y =-1;y<2;y++){
			//make sure the they aren't diagonals
			if(Math.abs(x)==Math.abs(y)){continue;}
			//calculate the side were exploring using mods
			var curSide =(side+x+hex.sides)%hex.sides;
			//calculate the index
			var curIndex = index+y;
			//making sure the block exists at this side and index
			if(hex.blocks[curSide] === undefined){continue;}
			if(hex.blocks[curSide][curIndex] !== undefined){
				// checking equivalency of color, if its already been explored, and if it isn't already deleted
				if(hex.blocks[curSide][curIndex].color == color && search(deleting,[curSide,curIndex]) === false && hex.blocks[curSide][curIndex].deleted === 0 ) {
					//add this to the array of already explored
					deleting.push([curSide,curIndex]);
					//recall with next block explored
					floodFill(hex,curSide,curIndex,deleting);
				}
			}
		}
	}
}

function consolidateBlocks(hex,side,index){
	//record which sides have been changed
	var sidesChanged =[];
	var deleting=[];
	var deletedBlocks = [];
	//add start case
	deleting.push([side,index]);
	//fill deleting
	floodFill(hex,side,index,deleting);
	//make sure there are more than 3 blocks to be deleted
	if(deleting.length<3){return;}
	var i;
	for(i=0; i<deleting.length;i++) {
		var arr = deleting[i];
		//just making sure the arrays are as they should be
		if(arr !== undefined && arr.length==2) {
			//add to sides changed if not in there
			if(sidesChanged.indexOf(arr[0])==-1){
				sidesChanged.push(arr[0]);
			}
			//mark as deleted
			hex.blocks[arr[0]][arr[1]].deleted = 1;
			deletedBlocks.push(hex.blocks[arr[0]][arr[1]]);
		}
	}

	// add scores
	var now = MainHex.ct;
	if(now - hex.lastCombo < settings.comboTime ){
		settings.comboTime = (1/settings.creationSpeedModifier) * (waveone.nextGen/16.666667) * 3;
		hex.comboMultiplier += 1;
		hex.lastCombo = now;
		var coords = findCenterOfBlocks(deletedBlocks);
		hex.texts.push(new Text(coords['x'],coords['y'],"x "+hex.comboMultiplier.toString(),"bold Q","#fff",fadeUpAndOut));
	}
	else{
		settings.comboTime = 240;
		hex.lastCombo = now;
		hex.comboMultiplier = 1;
	}
	var adder = deleting.length * deleting.length * hex.comboMultiplier;
	hex.texts.push(new Text(hex.x,hex.y,"+ "+adder.toString(),"bold Q ",deletedBlocks[0].color,fadeUpAndOut));
		hex.lastColorScored = deletedBlocks[0].color;
	score += adder;
}

// Upstream wavegen.js
function blockDestroyed() {
	if (waveone.nextGen > 1350) {
		waveone.nextGen -= 30 * settings.creationSpeedModifier;
	} else if (waveone.nextGen > 600) {
		waveone.nextGen -= 8 * settings.creationSpeedModifier;
	} else {
		waveone.nextGen = 600;
	}

	if (waveone.difficulty < 35) {
		waveone.difficulty += 0.085 * settings.speedModifier;
	} else {
		waveone.difficulty = 35;
	}
}

function waveGen(hex) {
	this.lastGen = 0;
	this.last = 0;
	this.nextGen = 2700;
	this.start = 0;
	this.colors = colors;
	this.ct = 0;
	this.hex = hex;
	this.difficulty = 1;
	this.dt = 0;
	this.update = function() {
		this.currentFunction();
		this.dt = (settings.platform == 'mobile' ? 14 : 16.6667) * MainHex.ct;
		this.computeDifficulty();
		if ((this.dt - this.lastGen) * settings.creationSpeedModifier > this.nextGen) {
			if (this.nextGen > 600) {
				this.nextGen -= 11 * ((this.nextGen / 1300)) * settings.creationSpeedModifier;
			}
		}
	};

	this.randomGeneration = function() {
		if (this.dt - this.lastGen > this.nextGen) {
			this.ct++;
			this.lastGen = this.dt;
			var fv = randInt(0, MainHex.sides);
			addNewBlock(fv, colors[randInt(0, colors.length)], 1.6 + (this.difficulty / 15) * 3);
			var lim = 5;
			if (this.ct > lim) {
				var nextPattern = randInt(0, 3 + 21);
				if (nextPattern > 15) {
					this.ct = 0;
					this.currentFunction = this.doubleGeneration;
				} else if (nextPattern > 10) {
					this.ct = 0;
					this.currentFunction = this.crosswiseGeneration;
				} else if (nextPattern > 7) {
					this.ct = 0;
					this.currentFunction = this.spiralGeneration;
				} else if (nextPattern > 4) {
					this.ct = 0;
					this.currentFunction = this.circleGeneration;
				} else if (nextPattern > 1) {
					this.ct = 0;
					this.currentFunction = this.halfCircleGeneration;
				}
			}
		}
	};

	this.computeDifficulty = function() {
		if (this.difficulty < 35) {
			var increment;
			if (this.difficulty < 8) {
				 increment = (this.dt - this.last) / (5166667) * settings.speedModifier;
			} else if (this.difficulty < 15) {
				increment = (this.dt - this.last) / (72333333) * settings.speedModifier;
			} else {
				increment = (this.dt - this.last) / (90000000) * settings.speedModifier;
			}

			this.difficulty += increment * (1/2);
		}
	};

	this.circleGeneration = function() {
		if (this.dt - this.lastGen > this.nextGen + 500) {
			var numColors = randInt(1, 4);
			if (numColors == 3) {
				numColors = randInt(1, 4);
			}

			var colorList = [];
			nextLoop: for (var i = 0; i < numColors; i++) {
				var q = randInt(0, colors.length);
				for (var j in colorList) {
					if (colorList[j] == colors[q]) {
						i--;
						continue nextLoop;
					}
				}
				colorList.push(colors[q]);
			}

			for (var i = 0; i < MainHex.sides; i++) {
				addNewBlock(i, colorList[i % numColors], 1.5 + (this.difficulty / 15) * 3);
			}

			this.ct += 15;
			this.lastGen = this.dt;
			this.shouldChangePattern(1);
		}
	};

	this.halfCircleGeneration = function() {
		if (this.dt - this.lastGen > (this.nextGen + 500) / 2) {
			var numColors = randInt(1, 3);
			var c = colors[randInt(0, colors.length)];
			var colorList = [c, c, c];
			if (numColors == 2) {
				colorList = [c, colors[randInt(0, colors.length)], c];
			}

			var d = randInt(0, 6);
			for (var i = 0; i < 3; i++) {
				addNewBlock((d + i) % 6, colorList[i], 1.5 + (this.difficulty / 15) * 3);
			}

			this.ct += 8;
			this.lastGen = this.dt;
			this.shouldChangePattern();
		}
	};

	this.crosswiseGeneration = function() {
		if (this.dt - this.lastGen > this.nextGen) {
			var ri = randInt(0, colors.length);
			var i = randInt(0, colors.length);
			addNewBlock(i, colors[ri], 0.6 + (this.difficulty / 15) * 3);
			addNewBlock((i + 3) % MainHex.sides, colors[ri], 0.6 + (this.difficulty / 15) * 3);
			this.ct += 1.5;
			this.lastGen = this.dt;
			this.shouldChangePattern();
		}
	};

	this.spiralGeneration = function() {
		var dir = randInt(0, 2);
		if (this.dt - this.lastGen > this.nextGen * (2 / 3)) {
			if (dir) {
				addNewBlock(5 - (this.ct % MainHex.sides), colors[randInt(0, colors.length)], 1.5 + (this.difficulty / 15) * (3 / 2));
			} else {
				addNewBlock(this.ct % MainHex.sides, colors[randInt(0, colors.length)], 1.5 + (this.difficulty / 15) * (3 / 2));
			}
			this.ct += 1;
			this.lastGen = this.dt;
			this.shouldChangePattern();
		}
	};

	this.doubleGeneration = function() {
		if (this.dt - this.lastGen > this.nextGen) {
			var i = randInt(0, colors.length);
			addNewBlock(i, colors[randInt(0, colors.length)], 1.5 + (this.difficulty / 15) * 3);
			addNewBlock((i + 1) % MainHex.sides, colors[randInt(0, colors.length)], 1.5 + (this.difficulty / 15) * 3);
			this.ct += 2;
			this.lastGen = this.dt;
			this.shouldChangePattern();
		}
	};

	this.setRandom = function() {
		this.ct = 0;
		this.currentFunction = this.randomGeneration;
	};

	this.shouldChangePattern = function(x) {
		if (x) {
			var q = randInt(0, 4);
			this.ct = 0;
			switch (q) {
				case 0:
					this.currentFunction = this.doubleGeneration;
					break;
				case 1:
					this.currentFunction = this.spiralGeneration;
					break;
				case 2:
					this.currentFunction = this.crosswiseGeneration;
					break;
			}
		} else if (this.ct > 8) {
			if (randInt(0, 2) === 0) {
				this.setRandom();
				return 1;
			}
		}

		return 0;
	};

	// rest of generation functions

	this.currentFunction = this.randomGeneration;
}

// Upstream update.js

//remember to update history function to show the respective iter speeds
function update(dt) {
	MainHex.dt = dt;
	if (gameState == 1) {
		waveone.update();
		if (MainHex.ct - waveone.prevTimeScored > 1000) {
			waveone.prevTimeScored = MainHex.ct;
		}
	}
	var lowestDeletedIndex = 99;
	var i;
	var j;
	var block;

	var objectsToRemove = [];
	for (i = 0; i < blocks.length; i++) {
		MainHex.doesBlockCollide(blocks[i]);
		if (!blocks[i].settled) {
			if (!blocks[i].initializing) blocks[i].distFromHex -= blocks[i].iter * dt * settings.scale;
		} else if (!blocks[i].removed) {
			blocks[i].removed = 1;
		}
	}

	for (i = 0; i < MainHex.blocks.length; i++) {
		for (j = 0; j < MainHex.blocks[i].length; j++) {
			if (MainHex.blocks[i][j].checked ==1 ) {
				consolidateBlocks(MainHex,MainHex.blocks[i][j].attachedLane,MainHex.blocks[i][j].getIndex());
				MainHex.blocks[i][j].checked=0;
			}
		}
	}

	for (i = 0; i < MainHex.blocks.length; i++) {
		lowestDeletedIndex = 99;
		for (j = 0; j < MainHex.blocks[i].length; j++) {
			block = MainHex.blocks[i][j];
			if (block.deleted == 2) {
				MainHex.blocks[i].splice(j,1);
				blockDestroyed();
				if (j < lowestDeletedIndex) lowestDeletedIndex = j;
				j--;
			}
		}

		if (lowestDeletedIndex < MainHex.blocks[i].length) {
			for (j = lowestDeletedIndex; j < MainHex.blocks[i].length; j++) {
				MainHex.blocks[i][j].settled = 0;
			}
		}
	}

	for (i = 0; i < MainHex.blocks.length; i++) {
		for (j = 0; j < MainHex.blocks[i].length; j++) {
			block = MainHex.blocks[i][j];
			MainHex.doesBlockCollide(block, j, MainHex.blocks[i]);

			if (!MainHex.blocks[i][j].settled) {
				MainHex.blocks[i][j].distFromHex -= block.iter * dt * settings.scale;
			}
		}
	}

	for(i = 0; i < blocks.length;i++){
		if (blocks[i].removed == 1) {
			blocks.splice(i,1);
			i--;
		}
	}

	MainHex.ct += dt;
}

// Upstream comboTimer.js
function drawTimer() {
	if(gameState==1){
		var leftVertexes = [];
		var rightVertexes = [];
	if(MainHex.ct - MainHex.lastCombo < settings.comboTime){
		for(var i=0;i<6;i++){
			var done = (MainHex.ct -MainHex.lastCombo);
			if(done<(settings.comboTime)*(5-i)*(1/6)){
				leftVertexes.push(calcSide(i,i+1,1,1));
								rightVertexes.push(calcSide(12-i,11-i,1,1));
			}
			else{
				leftVertexes.push(calcSide(i,i+1,1-((done*6)/settings.comboTime)%(1),1));
				rightVertexes.push(calcSide(12-i,11-i,1-((done*6)/settings.comboTime)%(1),1));
				break;
			}
		}
	}
		if(rightVertexes.length !== 0) drawSide(rightVertexes);
		if(leftVertexes.length !== 0) drawSide(leftVertexes);
	}
}

function calcSide(startVertex,endVertex,fraction,offset){
	startVertex = (startVertex+offset)%12;
	endVertex = (endVertex+offset)%12;
	ctx.globalAlpha=1;
	ctx.beginPath();
	ctx.lineCap = "round";

	var radius = (settings.rows * settings.blockHeight) * (2/Math.sqrt(3)) + settings.hexWidth ;
	var halfRadius = radius/2;
	var triHeight = radius *(Math.sqrt(3)/2);
	var Vertexes =[
		[(halfRadius*3)/2,triHeight/2],
		[radius,0],
		[(halfRadius*3)/2,-triHeight/2],
		[halfRadius,-triHeight],
		[0,-triHeight],
		[-halfRadius,-triHeight],
		[-(halfRadius*3)/2,-triHeight/2],
		[-radius,0],
		[-(halfRadius*3)/2,triHeight/2],
		[-halfRadius,triHeight],
		[0,triHeight],
		[halfRadius,triHeight]
	].reverse();
	var startX =trueCanvas.width/2 + Vertexes[startVertex][0];
	var startY =trueCanvas.height/2 + Vertexes[startVertex][1];
	var endX = trueCanvas.width/2 + Vertexes[endVertex][0];
	var endY = trueCanvas.height/2 + Vertexes[endVertex][1];
		return [[startX,startY],[((endX-startX)*fraction)+startX,((endY-startY)*fraction)+startY]];
}
function drawSide(vertexes){
	if (gameState === 0) {
		ctx.strokeStyle = hexColorsToTintedColors[MainHex.lastColorScored];
	} else {
		ctx.strokeStyle = MainHex.lastColorScored;
	}
	ctx.lineWidth =4*settings.scale;
		ctx.moveTo(vertexes[0][0][0],vertexes[0][0][1]);
	ctx.lineTo(vertexes[0][1][0],vertexes[0][1][1]);
		for(var i=1;i<vertexes.length;i++){
			ctx.lineTo(vertexes[i][1][0],vertexes[i][1][1]);
			ctx.moveTo(vertexes[i][1][0],vertexes[i][1][1]);
		}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

}
function drawPolygon(x, y, sides, radius, theta, fillColor, lineWidth, lineColor) {
	ctx.fillStyle = fillColor;
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = lineColor;

	ctx.beginPath();
	var coords = rotatePoint(0, radius, theta);
	ctx.moveTo(coords.x + x, coords.y + y);
	var oldX = coords.x;
	var oldY = coords.y;
	for (var i = 0; i < sides; i++) {
		coords = rotatePoint(oldX, oldY, 360 / sides);
		ctx.lineTo(coords.x + x, coords.y + y);
		oldX = coords.x;
		oldY = coords.y;
	}

	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.strokeStyle = 'rgba(0,0,0,0)';
}


  function renderText(x, y, size, color, text) {
    ctx.save();
    ctx.font = `${size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.fillText(String(text), x, y); ctx.restore();
  }
  function addNewBlock(lane, color, speed) {
    blocks.push(new Block(lane, color, speed * settings.speedModifier));
  }
  const blockFields = ['settled','height','fallingLane','checked','angle','angularVelocity',
    'targetAngle','deleted','removed','tint','opacity','initializing','ict','iter','initLen',
    'attachedLane','distFromHex'];
  const hexFields = ['position','angle','targetAngle','angularVelocity','ct','lastCombo',
    'comboMultiplier','lastRotate'];
  const waveFields = ['lastGen','last','nextGen','start','ct','difficulty','dt'];
  function pick(object, fields) {
    return Object.fromEntries(fields.map(key => [key, object[key]]));
  }
  function blockData(b) { return { ...pick(b, blockFields), color: b.color }; }
  function restoreBlock(data) {
    const b = new Block(data.fallingLane, data.color, data.iter);
    for (const key of blockFields) b[key] = data[key];
    return b;
  }
  MainHex = new Hex(settings.hexWidth);
  MainHex.comboMultiplier = 1;
  waveone = new waveGen(MainHex);
  const patternNames = ['randomGeneration','doubleGeneration','crosswiseGeneration',
    'spiralGeneration','circleGeneration','halfCircleGeneration'];
  if (isHexSnapshot(saved)) {
    score = saved.score;
    for (const key of hexFields) MainHex[key] = saved.hex[key];
    MainHex.lastColorScored = saved.lastColor;
    MainHex.blocks = saved.lanes.map(lane => lane.map(restoreBlock));
    blocks = saved.falling.map(restoreBlock);
    settings.comboTime = saved.comboTime;
    for (const key of waveFields) waveone[key] = saved.wave[key];
    waveone.currentFunction = waveone[patternNames[saved.pattern]];
  }
  function draw() {
    ctx.globalAlpha = 1; ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, 800, 800);
    drawPolygon(400, 400, 6, settings.rows * 20 * 2 / Math.sqrt(3) + 87,
      30, '#bdc3c7', 0, 'transparent');
    drawTimer();
    for (const lane of MainHex.blocks) for (let i=0; i<lane.length; i++) lane[i].draw(true,i);
    for (const block of blocks) block.draw();
    MainHex.draw();
    renderText(400 + gdx, 400 + gdy, 48, '#ecf0f1', score);
    MainHex.texts = MainHex.texts.filter(text => text.draw());
    ctx.globalAlpha = 1;
  }
  return {
    rotate(steps) { MainHex.rotate(steps); },
    tick(fast = false) {
      MainHex.dt = fast ? 4 : 1;
      draw();
      update(MainHex.dt);
    },
    drawInitial() { MainHex.dt = 0; draw(); },
    get score() { return score; },
    get over() { return MainHex.blocks.some(lane => lane.filter(b => !b.deleted).length > settings.rows); },
    get combo() { return MainHex.ct - MainHex.lastCombo < settings.comboTime ? MainHex.comboMultiplier : 1; },
    snapshot() {
      return { version: 1, score, hex: pick(MainHex, hexFields), lastColor: MainHex.lastColorScored,
        comboTime: settings.comboTime, lanes: MainHex.blocks.map(lane => lane.map(blockData)),
        falling: blocks.map(blockData), wave: pick(waveone, waveFields),
        pattern: patternNames.findIndex(name => waveone[name] === waveone.currentFunction) };
    }
  };
}
