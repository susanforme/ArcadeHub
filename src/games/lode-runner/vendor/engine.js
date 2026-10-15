/**
 * @license ==================================================================================
 * Lode Runner main program
 *
 * This program is a HTML5 remake of the Lode Runner games (APPLE II & C64 version).
 *
 * The program code base on CreateJS JavaScript libraries !
 * http://www.createjs.com/
 *
 * The AI algorithm reference book:
 * http://www.kingstone.com.tw/book/book_page.asp?kmcode=2014710650538
 * http://www.amazon.co.jp/Lode-Runnerで学ぶ実践C言語-ビー・エヌ・エヌ企画部/dp/4893690116
 *
 * Source Code: https://github.com/SimonHung/LodeRunner_TotalRecall
 * Web page: http://LodeRunnerWebGame.com
 *
 * by Simon Hung 06/20/2014, 06/13/2015, 09/28/2016
 * ==================================================================================
 */
// Adapted from Simon Hung's LodeRunner TotalRecall, cceca5d5a15a21f724836654a46bf2501968e142.
// See ../assets/NOTICE.txt. Runner/guard rules below retain the upstream AI v4.
import { levels } from '../levels';

const runnerFrames = {
  runRight: [0, 1, 2], runLeft: [3, 4, 5], runUpDn: [6, 7],
  barRight: [18, 19, 19, 20, 20], barLeft: [21, 22, 22, 23, 23],
  digRight: [24], digLeft: [25], fallRight: [8], fallLeft: [26],
};
const guardFrames = {
  runRight: [0, 1, 2], runLeft: [3, 4, 5], runUpDn: [6, 7],
  barRight: [22, 23, 23, 24, 24], barLeft: [25, 26, 26, 27, 27],
  reborn: [28, 28, 29], fallRight: [8], fallLeft: [30],
  shakeRight: [8], shakeLeft: [30],
};
class Sprite {
  constructor(sheet, shape) {
    this.spriteSheet = sheet;
    this.x = this.y = this.currentFrame = this.currentAnimationFrame = 0;
    this.alpha = 1;
    this.paused = true;
    this.currentAnimation = '';
    if (shape !== undefined) this.gotoAndStop(shape);
  }
  set(values) { Object.assign(this, values); return this; }
  setTransform(x, y) { this.x = x; this.y = y; return this; }
  frames() {
    const atlas = this.spriteSheet === 'runner' ? runnerFrames : guardFrames;
    return atlas[this.currentAnimation] ?? [this.currentFrame];
  }
  gotoAndStop(shape) {
    this.currentAnimationFrame = 0;
    this.currentAnimation = typeof shape === 'string' ? shape : '';
    this.currentFrame = typeof shape === 'number' ? shape : this.frames()[0];
    this.paused = true;
  }
  gotoAndPlay(shape) { this.gotoAndStop(shape); this.play(); }
  play() { this.paused = false; }
  stop() { this.paused = true; }
  removeAllEventListeners() {}
  tick() {
    if (this.paused || !this.currentAnimation) return;
    const frames = this.frames();
    this.currentAnimationFrame = (this.currentAnimationFrame + (this.spriteSheet === 'runner' ? 0.8 : 0.4)) % frames.length;
    this.currentFrame = frames[Math.floor(this.currentAnimationFrame)];
  }
}

export function createLodeRunner(options = {}, sound = () => {}) {

var VERSION = "2.30e";
var AI_VERSION = 4;

var NO_OF_TILES_X = 28,
	NO_OF_TILES_Y = 16;

var BASE_TILE_X = 40,
	BASE_TILE_Y = 44;

var GROUND_TILE_X = 40,
	GROUND_TILE_Y = 20,
	TEXT_TILE_X = 40,
	TEXT_TILE_Y = 44;

var BASE_SCREEN_X = (NO_OF_TILES_X * BASE_TILE_X);
var BASE_SCREEN_Y = (NO_OF_TILES_Y * BASE_TILE_Y + GROUND_TILE_Y + TEXT_TILE_Y);

var MIN_SCALE = 0.5,
	MAX_SCALE = 3;

var MENU_ICON_X = 40, MENU_ICON_Y = 36, ICON_BORDER = 4;
var BASE_ICON_X = (MENU_ICON_X + ICON_BORDER * 2);

var KEYCODE_BKSPACE = 8, //backspace
	KEYCODE_ENTER = 13,
	KEYCODE_SPACE = 32,
	KEYCODE_ESC = 27, //escape

	KEYCODE_X = 88,  //dig right
	KEYCODE_Y = 89,  //dig left (Y key to dig left, for German keyboards)
	KEYCODE_Z = 90,  //dig left

	KEYCODE_LEFT  = 37, //move left
	KEYCODE_RIGHT = 39, //move right
	KEYCODE_UP    = 38, //move up
	KEYCODE_DOWN  = 40, //move down

	KEYCODE_SUBTRACT = 109,  //Add KEYCODE_SUBTRACT & KEYCODE_HYPHEN for support fireFox 'dash' keycode
	KEYCODE_HYPHEN   = 173,  //
	KEYCODE_DASH = 189, //'-'
	KEYCODE_DOT  = 190, //'.'

	KEYCODE_U = 85,  //dig left
	KEYCODE_O = 79,  //dig right

	KEYCODE_J = 74,  //move left
	KEYCODE_L = 76,  //move right
	KEYCODE_I = 73,  //move up
	KEYCODE_K = 75,  //move down

	KEYCODE_PERIOD = 190, //'.'
	KEYCODE_COMMA  = 188, //','

	KEYCODE_A = 65, //'A'
	KEYCODE_C = 67, //'C'
	KEYCODE_D = 68, //'D'
	KEYCODE_E = 69, //'E'
	KEYCODE_G = 71, //'G'
	KEYCODE_H = 72, //'H'
	KEYCODE_Q = 81, //'Q'
	KEYCODE_R = 82, //'R'
	KEYCODE_S = 83, //'S'
	KEYCODE_T = 84, //'T'
	KEYCODE_V = 86, //'V'
	KEYCODE_W = 87; //'W'

var	KEYCODE_0 = 48,
	KEYCODE_1 = 49,
	KEYCODE_2 = 50,
	KEYCODE_3 = 51,
	KEYCODE_4 = 52,
	KEYCODE_5 = 53,
	KEYCODE_6 = 54,
	KEYCODE_7 = 55,
	KEYCODE_8 = 56,
	KEYCODE_9 = 57;

var SCORE_COMPLETE_LEVEL = 1500, SCORE_COUNTER = 15,
	SCORE_GET_GOLD = 250,
	SCORE_IN_HOLE = 75,
	SCORE_GUARD_DEAD = 75,
	SCORE_WIN_PER_MAN = 42500;

var SCORE_VALUE_PER_POINT = 100; //for modern & edit mode

var PLAY_NONE = 0, PLAY_CLASSIC = 1, PLAY_MODERN = 2, PLAY_DEMO = 3,
	PLAY_EDIT = 4, PLAY_TEST = 5, PLAY_AUTO = 6, PLAY_DEMO_ONCE = 7;

var GAME_START = 0,          GAME_RUNNING = 1,
	GAME_FINISH = 2,         GAME_FINISH_SCORE_COUNT= 3,
	GAME_WAITING = 4,        GAME_PAUSE = 5,
	GAME_NEW_LEVEL = 6,      GAME_RUNNER_DEAD = 7,
	GAME_OVER_ANIMATION = 8, GAME_OVER = 9,
	GAME_NEXT_LEVEL = 10,    GAME_PREV_LEVEL = 11,
	GAME_LOADING = 12,       GAME_WIN_SCORE_COUNT = 13,
	GAME_WIN = 14;

var ACT_UNKNOWN = -1, ACT_STOP = 0,
	ACT_LEFT = 1,     ACT_RIGHT = 2,
	ACT_UP = 3,       ACT_DOWN = 4,
	ACT_FALL = 5,     ACT_FALL_BAR = 6,
	ACT_DIG_LEFT = 7, ACT_DIG_RIGHT = 8,
	ACT_DIGGING  = 9,
	ACT_IN_HOLE  = 10, ACT_CLIMB_OUT = 11,
	ACT_REBORN = 12;

//value | Character | Type
//------+-----------+-----------
//  0x0 |  <space>  | Empty space
//  0x1 |     #     | Normal Brick
//  0x2 |     @     | Solid Brick
//  0x3 |     H     | Ladder
//  0x4 |     -     | Hand-to-hand bar (Line of rope)
//  0x5 |     X     | False brick
//  0x6 |     S     | Ladder appears at end of level
//  0x7 |     $     | Gold chest
//  0x8 |     0     | Guard
//  0x9 |     &     | Player

var EMPTY_T  = 0x00;
var BLOCK_T  = 0x01;
var SOLID_T  = 0x02;
var LADDR_T  = 0x03;
var BAR_T    = 0x04;
var TRAP_T   = 0x05;
var HLADR_T  = 0x06;
var GOLD_T   = 0x07;
var GUARD_T  = 0x08;
var RUNNER_T = 0x09;

var REBORN_T = 0x10; //template: for reborn

var CLOSE_SCREEN_SPEED = 35; //20 ~ 80

var MAX_OLD_GUARD = 6;   //maximum number of guards for AI Version 1 and 2
var MAX_NEW_GUARD = 5;   //for AI Version >= 3

var RUNNER_LIFE = 5;   //number of runner life
var RUNNER_MAX_LIFE = 100;

var MAX_TIME_COUNT = 999; //for moden mode
var TICK_COUNT_PER_TIME = 16;
var MAX_DEMO_WAIT_COUNT = 200 * TICK_COUNT_PER_TIME;

var MAX_EDIT_LEVEL = 120;

var MAX_HISCORE_RECORD = 10, MAX_HISCORE_NAME_LENGTH = 12;

//===========================
// Define value for playData
//===========================
var PLAY_DATA_USERDEF = 999;

//================================================
// Define themes string also as theme folder name
//================================================
var THEME_APPLE2 = "APPLE2";
var THEME_C64    = "C64";

//================================
// Below defined for LocalStorage
//================================

var STORAGE_LASTPLAY_MODE = "loderunner_lastplay";

var STORAGE_CLASSIC_INFO = "loderunner_classicInfo";

var STORAGE_MODERN_INFO = "loderunner_modernInfo";

var STORAGE_DEMO_INFO = "loderunner_demoInfo";

var STORAGE_FIRST_PLAY  = "loderunner_firstRun";

var STORAGE_MODERN_SCORE_INFO = "loderunner_modernScore";

var STORAGE_USER_INFO = "loderunner_userInfo"; //user created
var STORAGE_USER_SCORE_INFO = "loderunner_userScore"; //user created

var STORAGE_EDIT_INFO = "loderunner_editInfo";

var STORAGE_USER_LEVEL = "loderunner_userLevel";
var STORAGE_TEST_LEVEL  = "loderunner_testlevel";

var STORAGE_HISCORE_INFO = "loderunner_hiScore";

var STORAGE_LASTSCORE = "loderunner_lastScore";

var STORAGE_PLAYER_NAME = "loderunner_player";
var STORAGE_UID = "loderunner_uid";

var STORAGE_THEME_MODE = "loderunner_theme";
var STORAGE_THEME_COLOR = "loderunner_color_";

var STORAGE_REPEAT_ACTION = "loderunner_actRepeat";
var STORAGE_GAMEPAD_MODE = "loderunner_gamepadMode";

//================================
// backup & restore file header
//================================
var LRWG_FILE_START_INFO = "LODE RUNNER WEB GAME.";

  var tileW = 40, tileH = 44, tileScale = 1, tileWScale = 40, tileHScale = 44;
  var W2 = 20, W4 = 10, H2 = 22, H4 = 11, xMove = 8, yMove = 9;
  var maxTileX = 27, maxTileY = 15;
  var curAiVersion = 4, maxGuard = 5, curTheme = THEME_APPLE2;
  var playMode = PLAY_CLASSIC, curLevel = (options.level ?? 0) + 1;
  var runner = null, guard = [], map = [], guardCount = 0, goldCount = 0, goldComplete = 0;
  var gameState = GAME_START, keyAction = ACT_STOP;
  var curScore = options.score ?? 0, runnerLife = options.lives ?? 5;
  var phase = 'ready', waitTicks = 0;
  var recordMode = 0, recordCount = 0, RECORD_KEY = 1, RECORD_PLAY = 2;
  var godMode = false, redhatMode = true, loadingTxt = {text:''};
  var runnerData = 'runner', guardData = 'guard', redhatData = 'redhat', holeData = 'hole';
  var createjs = {Sprite};
  var holeObj = {sprite: new Sprite('hole', 0), action: ACT_STOP, digLimit: 8};
  // These display-list calls are intentionally inert: Phaser owns rendering and ordering.
  var mainStage = {addChild() {}, removeChild() {}};
  var soundFall = 'fall', soundDig = 'dig';
  var rng = (options.seed ?? globalThis.Math.floor(globalThis.Math.random() * 0xffffffff)) >>> 0;
  var math = globalThis.Math;
  var Math = Object.create(math);
  Math.random = () => {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    return rng / 0x100000000;
  };
  function soundPlay(name) { sound(name); }
  function soundStop(name) { sound(name, true); }
  function themeSoundPlay(name) { sound(name === 'reborn' ? 'born' : name); }
  function drawScore(value) { curScore += value; }
  function drawGold() {}
  function drawGuard() {}
  function moveChild2Top() {}
  function getThemeBitmap(name) { return new Sprite(name === 'solid' ? 'block' : name); }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function error(message) { throw new Error(message); }

function buildLevelMap(levelMap)
{
	var index = 0;
	var mapGuardCount = 0; //Number of original guards

	//(1) create empty map[x][y] array;
	map = [];
	for(var x = 0; x < NO_OF_TILES_X; x++) {
		map[x] = [];
		for(var y = 0; y < NO_OF_TILES_Y; y++) {
			map[x][y] = {};
			if(levelMap.charAt(index++) == '0') mapGuardCount++;
		}
	}

	//(2) draw map
	index = 0;
	for(var y = 0; y < NO_OF_TILES_Y; y++) {
		for(var x = 0; x < NO_OF_TILES_X; x++) {
			var id = levelMap.charAt(index++);
			var curTile;

			switch(id) {
			default:
			case ' ': //empty
				map[x][y].base = EMPTY_T;
				map[x][y].act  = EMPTY_T;
				map[x][y].bitmap = null;
				continue;
			case '#': //Normal Brick
				map[x][y].base = BLOCK_T;
				map[x][y].act = BLOCK_T;
				curTile = map[x][y].bitmap = getThemeBitmap("brick");
				break;
			case '@': //Solid Brick
				map[x][y].base = SOLID_T;
				map[x][y].act  = SOLID_T;
				curTile = map[x][y].bitmap = getThemeBitmap("solid");
				break;
			case 'H': //Ladder
				map[x][y].base =LADDR_T;
				map[x][y].act  =LADDR_T;
				curTile = map[x][y].bitmap = getThemeBitmap("ladder");
				break;
			case '-': //Line of rope
				map[x][y].base = BAR_T;
				map[x][y].act  = BAR_T;
				curTile = map[x][y].bitmap = getThemeBitmap("rope");
				break;
			case 'X': //False brick
				map[x][y].base = TRAP_T; //behavior same as empty
				map[x][y].act  = TRAP_T;
				curTile = map[x][y].bitmap = getThemeBitmap("brick");
				break;
			case 'S': //Ladder appears at end of level
				map[x][y].base = HLADR_T; //behavior same as empty before end of level
				map[x][y].act  = EMPTY_T; //behavior same as empty before end of level
				curTile = map[x][y].bitmap = getThemeBitmap("ladder");
				curTile.set({alpha:0});	//hide the laddr
				break;
			case '$': //Gold chest
				map[x][y].base = GOLD_T; //keep gold on base map
				map[x][y].act  = EMPTY_T;
				curTile = map[x][y].bitmap = getThemeBitmap("gold");
				goldCount++;
				break;
			case '0': //Guard
				map[x][y].base = EMPTY_T;
				map[x][y].act  = GUARD_T;
				map[x][y].bitmap = null;
				if(--mapGuardCount >= maxGuard) {
					map[x][y].act = EMPTY_T;
					continue;  //too many guards, set this tile as empty
				}

				curTile = new createjs.Sprite(guardData, "runLeft");
				guard[guardCount] = {
					sprite: curTile,
					pos: { x:x, y:y, xOffset:0, yOffset:0},
					action: ACT_STOP,
					shape: "runLeft",
					lastLeftRight: "ACT_LEFT",
					hasGold: 0
				};
				guardCount++;
				curTile.stop();
				break;
			case '&': //Player
				map[x][y].base = EMPTY_T;
				map[x][y].act  = RUNNER_T;
				map[x][y].bitmap = null;
				if(runner !=  null) {
					map[x][y].act  = EMPTY_T;
					continue;  //too many runner, set this tile as empty
				}
				runner = {};
				curTile = runner.sprite = new createjs.Sprite(runnerData, "runRight");
				runner.pos = { x:x, y:y, xOffset:0, yOffset:0};
				runner.action = ACT_UNKNOWN;
				runner.shape = "runRight";
				runner.lastLeftRight = "ACT_RIGHT";
				curTile.stop();
				break;
			}
			curTile.setTransform(x * tileWScale, y * tileHScale, tileScale, tileScale); //x,y, scaleX, scaleY
			mainStage.addChild(curTile);
		}
	}
	assert(mapGuardCount == 0, "Error: mapCuardCount design error !" );
	moveSprite2Top();
}

function moveSprite2Top()
{
	//move guard to top (z index)
	for(var i = 0; i < guardCount; i++) {
		moveChild2Top(mainStage, guard[i].sprite);
	}

	if(runner == null) {
		error("Without runner ???");
	} else {
		//move runner to top (z index)
		moveChild2Top(mainStage, runner.sprite);
	}

	//move fill hole object to top
	moveFillHoleObj2Top();

	//move debug text to top
	moveChild2Top(mainStage, loadingTxt); //for debug
}


//=============================================================================
// AI reference book: "玩 Lode Runner 學 C 語言"
// http://www.kingstone.com.tw/book/book_page.asp?kmcode=2014710650538
//=============================================================================

var STATE_OK_TO_MOVE = 1, STATE_FALLING = 2;

function moveRunner()
{
	var x = runner.pos.x;
	var xOffset = runner.pos.xOffset;
	var y = runner.pos.y;
	var yOffset = runner.pos.yOffset;

	var curState;
	var curToken, nextToken;

	curToken = map[x][y].base;

	if ( curToken == LADDR_T || (curToken == BAR_T && yOffset == 0) ) { //ladder & bar
		curState = STATE_OK_TO_MOVE; //ok to move (on ladder or bar)
	} else if (yOffset < 0) {  //no ladder && yOffset < 0 ==> falling
		curState = STATE_FALLING;
	} else if (y < maxTileY) { //no laddr && y < maxTileY && yOffset >= 0

		nextToken = map[x][y+1].act;

		switch (true) {
		case (nextToken == EMPTY_T):
			curState = STATE_FALLING;
			break;
		case ( nextToken == BLOCK_T || nextToken == LADDR_T || nextToken == SOLID_T):
			curState = STATE_OK_TO_MOVE;
			break;
		case ( nextToken == GUARD_T):
			curState = STATE_OK_TO_MOVE;
			break;
		default:
			curState = STATE_FALLING;
			break;
		}
	} else { // no laddr && y == maxTileY
		curState = STATE_OK_TO_MOVE;
	}

	if ( curState == STATE_FALLING ) {
		stayCurrPos = ( y >= maxTileY ||
			(nextToken = map[x][y+1].act) == BLOCK_T ||
			 nextToken == SOLID_T || nextToken == GUARD_T);

		runnerMoveStep(ACT_FALL, stayCurrPos);
		return;
	}

	/****** Check Key Action ******/

	var moveStep = ACT_STOP;
	var stayCurrPos = 1;

	switch(keyAction) {
	case ACT_UP:
		stayCurrPos = ( y <= 0 ||
			 ( nextToken = map[x][y-1].act) == BLOCK_T ||
			   nextToken == SOLID_T || nextToken == TRAP_T );

		if (y > 0 && map[x][y].base != LADDR_T && yOffset < H4 && yOffset > 0 && map[x][y+1].base == LADDR_T)
		{
			stayCurrPos = 1;
			moveStep = ACT_UP;
		} else
		if (!( map[x][y].base != LADDR_T &&
			(yOffset <= 0 || map[x][y+1].base != LADDR_T) ||
			(yOffset <= 0 &&  stayCurrPos ) )
		) {
			moveStep = ACT_UP;
		}

        break;
	case ACT_DOWN:
		stayCurrPos = ( y >= maxTileY ||
			(nextToken = map[x][y+1].act) == BLOCK_T ||
			 nextToken == SOLID_T);

		if (!(yOffset >= 0 && stayCurrPos))
			moveStep = ACT_DOWN;
		break;
	case ACT_LEFT:
		stayCurrPos = ( x <= 0 ||
			(nextToken = map[x-1][y].act) == BLOCK_T ||
			 nextToken == SOLID_T || nextToken == TRAP_T);

		if (!(xOffset <= 0 && stayCurrPos))
			moveStep = ACT_LEFT;
		break;
	case ACT_RIGHT:
		stayCurrPos = ( x >= maxTileX	||
			(nextToken = map[x+1][y].act) == BLOCK_T ||
			 nextToken == SOLID_T || nextToken == TRAP_T);

		if (!(xOffset >= 0 && stayCurrPos))
			moveStep = ACT_RIGHT;
		break;
	case ACT_DIG_LEFT:
	case ACT_DIG_RIGHT:
		if(ok2Dig(keyAction)) {
			runnerMoveStep(keyAction, stayCurrPos);
			digHole(keyAction);
		} else {
			runnerMoveStep(ACT_STOP, stayCurrPos);
		}
		keyAction = ACT_STOP;
		return;
	}
	runnerMoveStep(moveStep, stayCurrPos);
}

function runnerMoveStep(action, stayCurrPos )
{
	var x = runner.pos.x;
	var xOffset = runner.pos.xOffset;
	var y = runner.pos.y;
	var yOffset = runner.pos.yOffset;

	var curToken, nextToken, centerX, centerY;
	var curShape, newShape;

	curShape = newShape = runner.shape;

	centerX = centerY = ACT_STOP;

	switch(action)	{
	case ACT_DIG_LEFT:
	case ACT_DIG_RIGHT:
		xOffset = 0;
		yOffset = 0;
		break;
	case ACT_UP:
	case ACT_DOWN:
	case ACT_FALL:
		if ( xOffset > 0 ) centerX = ACT_LEFT;
		else if (xOffset < 0) centerX = ACT_RIGHT;
		break;
	case ACT_LEFT:
	case ACT_RIGHT:
		if( yOffset > 0 ) centerY = ACT_UP;
		else if (yOffset < 0) centerY = ACT_DOWN;
		break;
	}

	curToken = map[x][y].base;

	if ( action == ACT_UP ) {
		yOffset -= yMove;

		if(stayCurrPos && yOffset < 0) yOffset = 0; //stay on current position
		else if(yOffset < -H2) { //move to y-1 position
			if ( curToken == BLOCK_T || curToken == HLADR_T ) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x][y-1], so set [x][y].act to previous state
			y--;
			yOffset = tileH + yOffset;
			if(map[x][y].act == GUARD_T && guardAlive(x,y)) setRunnerDead(); //collision
		}
		newShape = "runUpDn";
	}

	if ( centerY == ACT_UP ) {
		yOffset -= yMove;
		if( yOffset < 0) yOffset = 0; //move to center Y
	}

	if ( action == ACT_DOWN || action == ACT_FALL) {
		var holdOnBar = 0;
		if(curToken == BAR_T) {
			if( yOffset < 0) holdOnBar = 1;
			else {
				//when runner with bar and press down will into falling state
				// except "laddr" or "guard" at below, 11/25/2016
				if(action == ACT_DOWN && y < maxTileY &&
					map[x][y+1].act != LADDR_T && map[x][y+1].act != GUARD_T)
				{
					action = ACT_FALL;
				}
			}
		}

		yOffset += yMove;

		if(holdOnBar == 1 && yOffset >= 0) {
			yOffset = 0; //fall and hold on bar
			action = ACT_FALL_BAR;
		}
		if(stayCurrPos && yOffset > 0) yOffset = 0; //stay on current position
		else if(yOffset > H2) { //move to y+1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x][y+1], so set [x][y].act to previous state
			y++;
			yOffset = yOffset - tileH;
			if(map[x][y].act == GUARD_T && guardAlive(x,y)) setRunnerDead(); //collision
		}

		if(action == ACT_DOWN) {
			newShape = "runUpDn";
		} else { //ACT_FALL or ACT_FALL_BAR

			if (y < maxTileY && map[x][y+1].act == GUARD_T) { //over guard
				//don't collision
				var id = getGuardId(x, y+1);
				if(yOffset > guard[id].pos.yOffset)	yOffset = guard[id].pos.yOffset;
			}

			if (action == ACT_FALL_BAR) {
				if(runner.lastLeftRight == ACT_LEFT) newShape = "barLeft";
				else newShape = "barRight";
			} else {
				if(runner.lastLeftRight == ACT_LEFT) newShape = "fallLeft";
				else newShape = "fallRight";

			}
		}
	}

	if ( centerY == ACT_DOWN ) {
		yOffset += yMove;
		if ( yOffset > 0 ) yOffset = 0; //move to center Y
	}

	if ( action == ACT_LEFT) {
		xOffset -= xMove;

		if(stayCurrPos && xOffset < 0) xOffset = 0; //stay on current position
		else if ( xOffset < -W2) { //move to x-1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x-1][y], so set [x][y].act to previous state
			x--;
			xOffset = tileW + xOffset;
			if(map[x][y].act == GUARD_T && guardAlive(x,y)) setRunnerDead(); //collision
		}
		if(curToken == BAR_T) newShape = "barLeft";
		else newShape = "runLeft";
	}

	if ( centerX == ACT_LEFT ) {
		xOffset -= xMove;
		if ( xOffset < 0) xOffset = 0; //move to center X
	}

	if ( action == ACT_RIGHT ) {
		xOffset += xMove;

		if(stayCurrPos && xOffset > 0) xOffset = 0; //stay on current position
		else if ( xOffset > W2) { //move to x+1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x+1][y], so set [x][y].act to previous state
			x++;
			xOffset = xOffset - tileW;
			if(map[x][y].act == GUARD_T && guardAlive(x,y)) setRunnerDead(); //collision
		}
		if(curToken == BAR_T) newShape = "barRight";
		else newShape = "runRight";
	}

	if ( centerX == ACT_RIGHT ) {
		xOffset += xMove;
		if ( xOffset > 0) xOffset = 0; //move to center X
	}

	if(action == ACT_STOP ) {
		if(runner.action == ACT_FALL) {
			soundStop(soundFall);
			themeSoundPlay("down");
		}
		if(runner.action != ACT_STOP){
			runner.sprite.stop();
			runner.action = ACT_STOP;
		}
	} else {
		runner.sprite.x = (x * tileW + xOffset) * tileScale | 0;
		runner.sprite.y = (y * tileH + yOffset) * tileScale | 0;
		runner.pos = { x:x, y:y, xOffset:xOffset, yOffset:yOffset};
		if(curShape != newShape) {
			runner.sprite.gotoAndPlay(newShape);
			runner.shape = newShape;
		}
		if(action != runner.action){
			if(runner.action == ACT_FALL) {
				soundStop(soundFall);
				themeSoundPlay("down");
			} else if ( action == ACT_FALL) {
				soundPlay(soundFall);
			}
			runner.sprite.play();
		}
		if(action == ACT_LEFT || action == ACT_RIGHT) runner.lastLeftRight = action;
		runner.action = action;
	}
	map[x][y].act = RUNNER_T;

	//show trap tile if runner fall into the tile, 9/12/2015
	if(map[x][y].base == TRAP_T) map[x][y].bitmap.set({alpha:0.5}); //show trap tile

	// Check runner to get gold (MAX MOVE MUST < H4 & W4)
	if( map[x][y].base == GOLD_T &&
		((!xOffset && yOffset >= 0 && yOffset < H4) ||
		 (!yOffset && xOffset >= 0 && xOffset < W4) ||
		 (y < maxTileY && map[x][y+1].base == LADDR_T && yOffset < H4) // gold above laddr
		)
	  )
	{
		removeGold(x,y);
		themeSoundPlay("getGold");
		decGold();
		//debug("gold = " + goldCount);
		if(playMode == PLAY_CLASSIC || playMode == PLAY_AUTO || playMode == PLAY_DEMO) {
			drawScore(SCORE_GET_GOLD);
		} else {
			//for modern mode , edit mode
			drawGold(1); //get gold
		}
	}
	//if(!goldCount && !goldComplete) showHideLaddr();

	//check collision with guard !
	checkCollision(x, y);
}

//dec gold count
function decGold()
{
	if(--goldCount <= 0) {
		showHideLaddr();
		if(runner.pos.y > 0) {
			if(curTheme == "C64")  soundPlay("goldFinish" + ((curLevel-1)%6+1)); //six sounds
			else soundPlay("goldFinish"); //for all apple2 mode, 9/12/2015
		}
	}
}

function removeGold(x,y)
{
	map[x][y].base = EMPTY_T;
	mainStage.removeChild(map[x][y].bitmap);
	map[x][y].bitmap = null;
}

function addGold(x, y)
{
	var tile;

	map[x][y].base = GOLD_T;
	tile = map[x][y].bitmap = getThemeBitmap("gold");
	tile.setTransform(x * tileWScale, y * tileHScale,tileScale, tileScale); //x,y, scaleX, scaleY
	mainStage.addChild(tile);

	moveSprite2Top(); //reset runner, guard & fill hole object order
}

function showHideLaddr()
{
	var haveHLadder = 0;
	for(var y = 0; y < NO_OF_TILES_Y; y++) {
		for(var x = 0; x < NO_OF_TILES_X; x++) {
			if( map[x][y].base == HLADR_T) {
				haveHLadder = 1;
				map[x][y].base =LADDR_T;
				map[x][y].act  =LADDR_T;
				map[x][y].bitmap.set({alpha:1}); //display laddr
			}
		}
	}
	goldComplete = 1;
	return haveHLadder;
}

function checkCollision(runnerX, runnerY)
{
	var x = -1, y = -1;
	//var dbg = "NO";

	switch(true) {
	case ( runnerY > 0 && map[runnerX][runnerY-1].act == GUARD_T):
		x = runnerX; y = runnerY-1;
		//dbg = "UP";
		break;
	case ( runnerY < maxTileY && map[runnerX][runnerY+1].act == GUARD_T):
		x = runnerX; y = runnerY+1;
		//dbg = "DN";
		break;
	case ( runnerX > 0 && map[runnerX-1][runnerY].act == GUARD_T):
		x = runnerX-1; y = runnerY;
		//dbg = "LF";
		break;
	case ( runnerX < maxTileX && map[runnerX+1][runnerY].act== GUARD_T):
		x = runnerX+1; y = runnerY;
		//dbg = "RT";
		break;
	}
	//if( dbg != "NO") debug(dbg);
	if( x >= 0) {
		for(var i = 0; i < guardCount; i++) {
			if( guard[i].pos.x == x && guard[i].pos.y == y) break;
		}
		assert( (i < guardCount), "checkCollision design error !");
		if(guard[i].action != ACT_REBORN) { //only guard alive need check collection
			//var dw = Math.abs(runner.sprite.x - guard[i].sprite.x);
			//var dh = Math.abs(runner.sprite.y - guard[i].sprite.y);

      //change detect method ==> don't depend on scale
			var runnerPosX = runner.pos.x*tileW+runner.pos.xOffset;
			var runnerPosY = runner.pos.y*tileH+runner.pos.yOffset;
			var guardPosX = guard[i].pos.x*tileW+guard[i].pos.xOffset;
			var guardPosY = guard[i].pos.y*tileH+guard[i].pos.yOffset;

			var dw = Math.abs(runnerPosX - guardPosX);
			var dh = Math.abs(runnerPosY - guardPosY);

			if( dw <= W4*3 && dh <= H4*3 ) {
				setRunnerDead(); //07/04/2014
				//debug("runner dead!");
			}
		}
	}
}

//Page 276 misc.c (book)
function ok2Dig(nextMove)
{
	var x = runner.pos.x;
	var y = runner.pos.y;
	var token, rc = 0;

	switch(nextMove) {
	case ACT_DIG_LEFT:
//		debug("[x-1][y+1] = " + map[x-1][y+1].act + " [x-1][y] = " + map[x-1][y].act +
//			  "[x-1][y].base = " + map[x-1][y].base );

		if( y < maxTileY && x > 0 && map[x-1][y+1].act == BLOCK_T &&
		    map[x-1][y].act == EMPTY_T && map[x-1][y].base != GOLD_T)
			rc = 1;
		break;
	case ACT_DIG_RIGHT:
//		debug("[x+1][y+1] = " + map[x+1][y+1].act + " [x+1][y] = " + map[x+1][y].act +
//			  "[x+1][y].base = " + map[x+1][y].base );

		if( y < maxTileY && x < maxTileX && map[x+1][y+1].act == BLOCK_T &&
		    map[x+1][y].act == EMPTY_T && map[x+1][y].base != GOLD_T)
			rc = 1;
		break;
	}

	return rc;
}

//=======================
// BEGIN NEW DIG METHOD
//=======================
var digHoleLeft =	[ 0, 1,  2,  2,  3,  4,  4,  5,  6,  6,  7 ];
var digHoleRight =	[ 8, 9, 10, 10, 11, 12, 12, 13, 14, 14, 15 ];

function processDigHole()
{
	if(curAiVersion < 3) return;

	if(++holeObj.curFrameIdx < holeObj.shapeFrame.length) {
		// change frame
		holeObj.sprite.gotoAndStop(holeObj.shapeFrame[holeObj.curFrameIdx]);
		holeObj.sprite.currentAnimationFrame = holeObj.curFrameIdx;
	} else { //dig complete
		digComplete();
	}
}
//========================
// END NEW DIG METHOD
//========================

var digTimeStart, shakeTimeStart;       //for debug
var fillHoleTimeStart, rebornTimeStart; //for debug
function digHole(action)
{
	var x,y, holeShape;

	if(action == ACT_DIG_LEFT) {
		x = runner.pos.x-1;
		y = runner.pos.y;

		runner.shape = "digLeft";
		holeShape = "digHoleLeft";

	} else { //DIG RIGHT

		x = runner.pos.x+1;
		y = runner.pos.y;

		runner.shape = "digRight";
		holeShape = "digHoleRight";
	}

	soundPlay(soundDig);
	map[x][y+1].bitmap.set({alpha:0}); //hide block (replace with digging image)
	runner.sprite.gotoAndPlay(runner.shape);

	holeObj.action = ACT_DIGGING;
	holeObj.pos = { x: x, y: y };
	holeObj.sprite.setTransform(x * tileWScale, y * tileHScale,tileScale, tileScale);

	digTimeStart = recordCount; //for debug

	if(curAiVersion < 3) {
		holeObj.sprite.gotoAndPlay(holeShape);
		holeObj.sprite.on("animationend", digComplete);
	} else {
		if(action == ACT_DIG_LEFT) holeShape = digHoleLeft;
		else holeShape = digHoleRight;

		holeObj.sprite.gotoAndStop(holeShape[0]);
		holeObj.shapeFrame = holeShape;
		holeObj.curFrameIdx = 0;
	}

	mainStage.addChild(holeObj.sprite);
}

var DEBUG_DIG=0;
function isDigging()
{
	var rc = 0;

	if(holeObj.action == ACT_DIGGING) {
		var x = holeObj.pos.x, y = holeObj.pos.y;
		if(map[x][y].act == GUARD_T) { //guard come close to the digging hole !
			var id = getGuardId(x, y);
			if(holeObj.sprite.currentAnimationFrame < holeObj.digLimit && guard[id].pos.yOffset > -H4) {
				if(DEBUG_DIG) loadingTxt.text = "dig : " + holeObj.sprite.currentAnimationFrame + " (X)";

				stopDigging(x,y);
			} else {
				if(DEBUG_DIG) loadingTxt.text = "dig : " + holeObj.sprite.currentAnimationFrame + " (O)";
				if(curAiVersion >= 3) { //This is a bug while AI VERSION < 3
					map[x][y+1].act = EMPTY_T; //assume hole complete
					rc = 1;
				}
			}
		} else {
			switch( runner.shape ) {
			case "digLeft":
				if(holeObj.sprite.currentAnimationFrame > 2 ) {
					runner.sprite.gotoAndStop("runLeft"); //change shape
					runner.shape = "runLeft";
					runner.action = ACT_STOP;
				}
				break;
			case "digRight":
				if(holeObj.sprite.currentAnimationFrame > 2) {
					runner.sprite.gotoAndStop("runRight"); //change shape
					runner.shape = "runRight";
					runner.action = ACT_STOP;
				}
				break;
			}
			rc = 1;
		}
	}
	return rc;
}

function stopDigging(x,y)
{
	//(1) remove holeObj
	holeObj.sprite.removeAllEventListeners ("animationend");
	holeObj.action = ACT_STOP; //no digging
	mainStage.removeChild(holeObj.sprite);

	//(2) fill hole
	y++;
	map[x][y].act = map[x][y].base; //BLOCK_T
	assert(map[x][y].base == BLOCK_T, "fill hole != BLOCK_T");
	map[x][y].bitmap.set({alpha:1}); //display block

	//(3) change runner shape
	switch( runner.shape ) {
	case "digLeft":
		runner.sprite.gotoAndStop("runLeft");
		runner.shape = "runLeft";
		runner.action = ACT_STOP;
		break;
	case "digRight":
		runner.sprite.gotoAndStop("runRight");
		runner.shape = "runRight";
		runner.action = ACT_STOP;
		break;
	}

	soundStop(soundDig); //stop sound of digging
}

function digComplete()
{
	var x = holeObj.pos.x;
	var y = holeObj.pos.y + 1;

	map[x][y].act = EMPTY_T;
	holeObj.sprite.removeAllEventListeners ("animationend");
	holeObj.action = ACT_STOP; //no digging
	mainStage.removeChild(holeObj.sprite);

	if(DEBUG_TIME) loadingTxt.text = "DigTime = " + (recordCount - digTimeStart);

	fillHole(x, y);
}

var fillHoleObj = [];
function fillHole(x, y)
{
	var fillSprite = new createjs.Sprite(holeData, "fillHole");

	fillSprite.pos = { x:x, y:y }; //save position 11/18/2014
	fillSprite.setTransform(x * tileWScale, y * tileHScale, tileScale, tileScale);

	if(curAiVersion < 3) {
		fillSprite.on("animationend", fillComplete, null, false, {obj:fillSprite} );
		fillSprite.play();
	} else {
		fillSprite.curFrameIdx  =   0;
		fillSprite.curFrameTime =  -1;
		fillSprite.gotoAndStop(fillHoleFrame[0]);
	}
	mainStage.addChild(fillSprite);
	fillHoleObj.push(fillSprite);

	fillHoleTimeStart = recordCount; //for debug
}

function moveFillHoleObj2Top()
{
	for(var i = 0; i < fillHoleObj.length; i++) {
		moveChild2Top(mainStage, fillHoleObj[i]);
	}
}

function fillComplete(evt, data)
{
	//don't use "divide command", it will cause loss of accuracy while scale changed (ex: tileScale = 0.6...)
	//var x = this.x / tileWScale | 0; //this : scope default to the dispatcher
	//var y = this.y / tileHScale | 0;

	var fillObj = data.obj;
	var x = fillObj.pos.x, y = fillObj.pos.y; //get position

	map[x][y].bitmap.set({alpha:1}); //display block
	fillObj.removeAllEventListeners ("animationend");
	mainStage.removeChild(fillObj);
	removeFillHoleObj(fillObj);

	switch(map[x][y].act) {
	case RUNNER_T : // runner dead
		//loadingTxt.text = "RUNNER DEAD";
		gameState = GAME_RUNNER_DEAD;
		runner.sprite.set({alpha:0}); //hidden runner --> dead
		break;
	case GUARD_T: //guard dead
		var id = getGuardId(x,y);
		if(curAiVersion >= 3 && guard[id].action == ACT_IN_HOLE) removeFromShake(id);
		if(guard[id].hasGold > 0) { //guard has gold and not fall into the hole
			decGold();
			guard[id].hasGold = 0;
			guardRemoveRedhat(guard[id]); //9/4/2016
		}
		guardReborn(x,y);
		if(playMode == PLAY_CLASSIC || playMode == PLAY_AUTO || playMode == PLAY_DEMO) {
			drawScore(SCORE_GUARD_DEAD);
		} else {
			//for modern mode & edit mode
			drawGuard(1); //guard dead, add count
		}
		break;
	}
	map[x][y].act = BLOCK_T;

	if(DEBUG_TIME) loadingTxt.text = "FillHoleTime = " + (recordCount - fillHoleTimeStart); //for debug
}

function removeFillHoleObj(spriteObj)
{
	for(var i = 0; i < fillHoleObj.length; i++) {
		if(fillHoleObj[i] == spriteObj) {
			fillHoleObj.splice(i,1);
			return;
		}
	}
	error("design error !");
}

//=======================================
// BEGIN NEW fill Hold (Ai version >= 3)
//=======================================

var fillHoleFrame = [  16, 17, 18, 19];
var fillHoleTime  = [ 166,  8,  8,  4];

function initFillHoleVariable()
{
	fillHoleObj = [];
}

function processFillHole()
{
	var curIdx, curFillObj;

	for(var i = 0; i < fillHoleObj.length;) {
		curFillObj = fillHoleObj[i];
		curIdx = curFillObj.curFrameIdx;

		if(++curFillObj.curFrameTime >= fillHoleTime[curIdx]) {
			if(++curFillObj.curFrameIdx < fillHoleFrame.length) {
				//change frame
				curFillObj.curFrameTime = 0;
				curFillObj.gotoAndStop(fillHoleFrame[curFillObj.curFrameIdx]);
			} else {
				//fill hole complete
				fillComplete(null, {obj: curFillObj});
				continue;
			}

		}
		i++;
	}
}
//====================
// END NEW fill Hold
//====================

//==================================
// Check guard is alive or not
// 2014/10/31
//==================================
function guardAlive(x, y)
{
	for(var i = 0; i < guardCount; i++) {
		if( guard[i].pos.x == x && guard[i].pos.y == y) break;
	}
	assert( (i < guardCount), "guardAlive() design error !");

	if(guard[i].action != ACT_REBORN) return 1; //alive

	return 0; //reborn
}
//=============================================================================
// AI reference book: "玩 Lode Runner 學 C 語言"
// http://www.kingstone.com.tw/book/book_page.asp?kmcode=2014710650538
//=============================================================================

var movePolicy = [ [0, 0, 0, 0, 0, 0], //* move_map is used to find *//
                   [0, 1, 1, 0, 1, 1], //* wheather to move a enm   *//
                   [1, 1, 1, 1, 1, 1], //* by indexing into it with *//
                   [1, 2, 1, 1, 2, 1], //* enm_byte + num_enm +     *//
                   [1, 2, 2, 1, 2, 2], //* set_num to get a byte.   *//
                   [2, 2, 2, 2, 2, 2], //* then that byte is checked*//
                   [2, 2, 3, 2, 2, 3], //* for !=0 and then decrmnt *//
                   [2, 3, 3, 2, 3, 3], //* for next test until = 0  *//
                   [3, 3, 3, 3, 3, 3],
                   [3, 3, 4, 3, 3, 4],
                   [3, 4, 4, 3, 4, 4],
                   [4, 4, 4, 4, 4, 4]
				 ];

var moveOffset = 0;
var moveId = 0;    //current guard id

var numOfMoveItems = movePolicy[0].length;

//********************************
//initial guard start move value
//********************************
function initGuardVariable()
{
	moveOffset = moveId = 0;
}

function moveGuard()
{
	var moves;
	var curGuard;
	var x, y, yOffset;

	if(!guardCount) return; //no guard

	if( ++moveOffset >= numOfMoveItems ) moveOffset = 0;
	moves = movePolicy[guardCount][moveOffset];  // get next moves

	while ( moves-- > 0) {                       // slows guard relative to runner
		if(++moveId >= guardCount) moveId = 0;
		curGuard = guard[moveId];

		if(curGuard.action == ACT_IN_HOLE || curGuard.action == ACT_REBORN) {
			continue;
		}

		guardMoveStep(moveId, bestMove(moveId));
	}
}

function guardMoveStep( id, action)
{
	var curGuard = guard[id];
	var x = curGuard.pos.x;
	var xOffset = curGuard.pos.xOffset;
	var y = curGuard.pos.y;
	var yOffset = curGuard.pos.yOffset;

	var curToken, nextToken;
	var centerX, centerY;
	var curShape, newShape;
	var stayCurrPos;

	centerX = centerY = ACT_STOP;
	curShape = newShape = curGuard.shape;

	if(curGuard.action == ACT_CLIMB_OUT && action == ACT_STOP)
		curGuard.action = ACT_STOP; //for level 16, 30, guard will stock in hole

	switch(action) {
	case ACT_UP:
	case ACT_DOWN:
	case ACT_FALL:
		if ( action == ACT_UP ) {
			stayCurrPos = ( y <= 0 ||
			                (nextToken = map[x][y-1].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == TRAP_T ||
                            nextToken == GUARD_T);

			if( yOffset <= 0 && stayCurrPos)
				action = ACT_STOP;
		} else { //ACT_DOWN || ACT_FALL
			stayCurrPos = ( y >= maxTileY ||
			                (nextToken = map[x][y+1].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == GUARD_T);

			if( action == ACT_FALL && yOffset < 0 && map[x][y].base == BLOCK_T) {
				action = ACT_IN_HOLE;
				stayCurrPos = 1;
			} else {
				if ( yOffset >= 0 && stayCurrPos)
					action = ACT_STOP;
			}
		}

		if ( action != ACT_STOP ) {
			if ( xOffset > 0)
				centerX = ACT_LEFT;
			else if ( xOffset < 0)
				centerX = ACT_RIGHT;
		}
		break;
	case ACT_LEFT:
	case ACT_RIGHT:
		if ( action == ACT_LEFT ) {
			/* original source code from book
			stayCurrPos = ( x <= 0 ||
			                (nextToken = map[x-1][y].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == TRAP_T ||
		                    nextToken == GUARD_T);
			*/
			// change check TRAP_T from base,
			// for support level 41==> runner in trap will cause guard move
			stayCurrPos = ( x <= 0 ||
			                (nextToken = map[x-1][y].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == GUARD_T ||
						    map[x-1][y].base == TRAP_T);

			if (xOffset <= 0 && stayCurrPos)
				action = ACT_STOP;
		} else { //ACT_RIGHT
			/* original source code from book
			stayCurrPos = ( x >= maxTileX ||
			                (nextToken = map[x+1][y].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == TRAP_T ||
		                    nextToken == GUARD_T);
			*/
			// change check TRAP_T from base,
			// for support level 41==> runner in trap will cause guard move
			stayCurrPos = ( x >= maxTileX ||
			                (nextToken = map[x+1][y].act) == BLOCK_T ||
			                nextToken == SOLID_T || nextToken == GUARD_T ||
		                    map[x+1][y].base == TRAP_T);

			if (xOffset >= 0 && stayCurrPos)
				action = ACT_STOP;
		}

		if ( action != ACT_STOP ) {
			if ( yOffset > 0 )
				centerY = ACT_UP;
			else if ( yOffset < 0)
				centerY = ACT_DOWN;
		}
		break;
	}

	curToken = map[x][y].base;

	if ( action == ACT_UP ) {
		yOffset -= yMove;

		if(stayCurrPos && yOffset < 0) yOffset = 0; //stay on current position
		else if(yOffset < -H2) { //move to y-1 position
			if ( curToken == BLOCK_T || curToken == HLADR_T ) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x][y-1], so set [x][y].act to previous state
			y--;
			yOffset = tileH + yOffset;
			if(map[x][y].act == RUNNER_T) setRunnerDead(); //collision
			//map[x][y].act = GUARD_T;
		}

		if( yOffset <= 0 && yOffset > -yMove) {
			dropGold(id); //decrease count
		}
		newShape = "runUpDn";
	}

	if ( centerY == ACT_UP ) {
		yOffset -= yMove;
		if( yOffset < 0) yOffset = 0; //move to center Y
	}

	if ( action == ACT_DOWN || action == ACT_FALL || action == ACT_IN_HOLE) {
		var holdOnBar = 0;
		if(curToken == BAR_T) {
			if( yOffset < 0) holdOnBar = 1;
			else if(action == ACT_DOWN && y < maxTileY && map[x][y+1].act != LADDR_T) {
				action = ACT_FALL; //shape fixed: 2014/03/27
			}
		}

		yOffset += yMove;

		if(holdOnBar == 1 && yOffset >= 0) {
			yOffset = 0; //fall and hold on bar
			action = ACT_FALL_BAR;
		}
		if(stayCurrPos && yOffset > 0 ) yOffset = 0; //stay on current position
		else if(yOffset > H2) { //move to y+1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x][y+1], so set [x][y].act to previous state
			y++;
			yOffset = yOffset - tileH;
			if(map[x][y].act == RUNNER_T) setRunnerDead(); //collision
			//map[x][y].act = GUARD_T;
		}

		//add condition: AI version >= 3 will decrease drop count while guard fall
		if( ((curAiVersion >= 3 && action == ACT_FALL) || action == ACT_DOWN) &&
		     yOffset >= 0 && yOffset < yMove)
		{ 	//try drop gold
			dropGold(id); //decrease count
		}

		if(action == ACT_IN_HOLE) { //check in hole or still falling
			if (yOffset < 0) {
				action = ACT_FALL; //still falling

				//----------------------------------------------------------------------
				//For AI version >= 4, drop gold before guard failing into hole totally
				if(curAiVersion >= 4 && curGuard.hasGold > 0) {
					if(map[x][y-1].base == EMPTY_T) {
						//drop gold above
						addGold(x, y-1);
					} else
						decGold(); //gold disappear
					curGuard.hasGold = 0;
					guardRemoveRedhat(curGuard); //9/4/2016
				}
				//----------------------------------------------------------------------

			} else { //fall into hole (yOffset MUST = 0)

				//----------------------------------------------------------------------
				//For AI version < 4, drop gold after guard failing into hole totally
				if( curGuard.hasGold > 0 ) {
					if(map[x][y-1].base == EMPTY_T) {
						//drop gold above
						addGold(x, y-1);
					} else
						decGold(); //gold disappear
				}
				curGuard.hasGold = 0;
				guardRemoveRedhat(curGuard); //9/4/2016
				//----------------------------------------------------------------------

				if( curShape == "fallRight") newShape = "shakeRight";
				else newShape = "shakeLeft";
				themeSoundPlay("trap");
				shakeTimeStart = recordCount; //for debug
				if(curAiVersion < 3) {
					curGuard.sprite.on("animationend", function() { climbOut(id); });
				} else {
					add2GuardShakeQueue(id, newShape);
				}

				if(playMode == PLAY_CLASSIC || playMode == PLAY_AUTO || playMode == PLAY_DEMO) {
					drawScore(SCORE_IN_HOLE);
				} else {
					//for modem mode & edit mode
					//drawGuard(1); //only guard dead need add count
				}
			}
		}

		if(action == ACT_DOWN) {
			newShape = "runUpDn";
		} else { //ACT_FALL or ACT_FALL_BAR
			if (action == ACT_FALL_BAR) {
				if(curGuard.lastLeftRight == ACT_LEFT) newShape = "barLeft";
				else newShape = "barRight";
			} else {
				if(action == ACT_FALL && curShape != "fallLeft" && curShape != "fallRight") {
					if (curGuard.lastLeftRight == ACT_LEFT) newShape = "fallLeft";
					else newShape = "fallRight";
				}
			}
		}
	}

	if ( centerY == ACT_DOWN ) {
		yOffset += yMove;
		if ( yOffset > 0 ) yOffset = 0; //move to center Y
	}

	if ( action == ACT_LEFT) {
		xOffset -= xMove;

		if(stayCurrPos && xOffset < 0) xOffset = 0; //stay on current position
		else if ( xOffset < -W2) { //move to x-1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x-1][y], so set [x][y].act to previous state
			x--;
			xOffset = tileW + xOffset;
			if(map[x][y].act == RUNNER_T) setRunnerDead(); //collision
			//map[x][y].act = GUARD_T;
		}
		if( xOffset <= 0 && xOffset > -xMove) {
			dropGold(id); //try to drop gold
		}
		if(curToken == BAR_T) newShape = "barLeft";
		else newShape = "runLeft";
	}

	if ( centerX == ACT_LEFT ) {
		xOffset -= xMove;
		if ( xOffset < 0) xOffset = 0; //move to center X
	}

	if ( action == ACT_RIGHT ) {
		xOffset += xMove;

		if(stayCurrPos && xOffset > 0) xOffset = 0; //stay on current position
		else if ( xOffset > W2) { //move to x+1 position
			if(curToken == BLOCK_T || curToken == HLADR_T) curToken = EMPTY_T; //in hole or hide laddr
			map[x][y].act = curToken; //runner move to [x+1][y], so set [x][y].act to previous state
			x++;
			xOffset = xOffset - tileW;
			if(map[x][y].act == RUNNER_T) setRunnerDead(); //collision
			//map[x][y].act = GUARD_T;
		}
		if( xOffset >= 0 && xOffset < xMove) {
			dropGold(id);
		}
		if(curToken == BAR_T) newShape = "barRight";
		else newShape = "runRight";
	}

	if ( centerX == ACT_RIGHT ) {
		xOffset += xMove;
		if ( xOffset > 0) xOffset = 0; //move to center X
	}

	//if(curGuard == ACT_CLIMB_OUT) action == ACT_CLIMB_OUT;

    if(action == ACT_STOP) {
		if(curGuard.action != ACT_STOP){
			curGuard.sprite.stop();
			if(curGuard.action != ACT_CLIMB_OUT) curGuard.action = ACT_STOP;
		}
	} else {
		if(curGuard.action == ACT_CLIMB_OUT) action = ACT_CLIMB_OUT;
		curGuard.sprite.x = (x * tileW + xOffset) * tileScale | 0;
		curGuard.sprite.y = (y * tileH + yOffset) * tileScale | 0;
		curGuard.pos = { x:x, y:y, xOffset:xOffset, yOffset:yOffset};
		if(curShape != newShape) {
			curGuard.sprite.gotoAndPlay(newShape);
			curGuard.shape = newShape;
		}
		if(action != curGuard.action){
			curGuard.sprite.play();
		}
		curGuard.action = action;
		if(action == ACT_LEFT || action == ACT_RIGHT) curGuard.lastLeftRight = action;
	}
	map[x][y].act = GUARD_T;

	// Check to get gold and carry
	if(map[x][y].base == GOLD_T && curGuard.hasGold == 0 &&
		((!xOffset && yOffset >= 0 && yOffset < H4) ||
		 (!yOffset && xOffset >= 0 && xOffset < W4) ||
		 (y < maxTileY && map[x][y+1].base == LADDR_T && yOffset < H4) // gold above laddr
		)
	  )
	{
		//curGuard.hasGold = ((Math.random()*26)+14)|0; //14 - 39
		curGuard.hasGold = ((Math.random()*26)+12)|0; //12 - 37 change gold drop steps
		guardWearRedhat(curGuard); //9/4/2016
		if(playMode == PLAY_AUTO || playMode == PLAY_DEMO || playMode == PLAY_DEMO_ONCE) 	getDemoGold(curGuard);
		if(recordMode) processRecordGold(curGuard);
		removeGold(x, y);
		//debug ("get, (x,y) = " + x + "," + y + ", offset = " + xOffset);
	}

	//check collision again
	//checkCollision(runner.pos.x, runner.pos.y);
}

//meanings: guard with gold
function guardWearRedhat(guard)
{
	if(redhatMode) guard.sprite.spriteSheet = redhatData;
}

//meanings: guard without gold
function guardRemoveRedhat(guard)
{
	if(redhatMode) guard.sprite.spriteSheet = guardData;
}

function dropGold(id)
{
	var curGuard = guard[id];
	var nextToken;
	var drop = 0;

	switch (true) {
	case (curGuard.hasGold > 1):
		curGuard.hasGold--; // count > 1,  don't drop it only decrease count
		//loadingTxt.text = "(" + id + ") = " + curGuard.hasGold;
		break;
	case (curGuard.hasGold == 1): //drop gold
		var x = curGuard.pos.x, y = curGuard.pos.y;

		if(map[x][y].base == EMPTY_T && ( y >= maxTileY ||
		   ((nextToken = map[x][y+1].base) == BLOCK_T ||
			nextToken == SOLID_T || nextToken == LADDR_T) )
		) {
			addGold(x,y);
			curGuard.hasGold = -1; //for record play action always use value = -1
			//curGuard.hasGold =  -(((Math.random()*10)+1)|0); //-1 ~ -10; //waiting time for get gold
			guardRemoveRedhat(curGuard); //9/4/2016
			drop = 1;
		}
		break;
	case (curGuard.hasGold < 0):
		curGuard.hasGold++; //wait, don't get gold till count = 0
		//loadingTxt.text = "(" + id + ") = " + curGuard.hasGold;
		break;
	}
	return drop;
}


//=============================================
// BEGIN NEW SHAKE METHOD for AI version >= 3
//=============================================
var DEBUG_TIME = 0;
var shakeRight  = [  8,  9, 10,  9, 10,  8 ];
var shakeLeft   = [ 30, 31, 32, 31, 32, 30 ];
var shakeTime   = [ 36,  3,  3,  3,  3,  3 ];

var shakingGuardList = [];

function initStillFrameVariable()
{
	initGuardShakeVariable();
	initFillHoleVariable();
	initRebornVariable();
}

function initGuardShakeVariable()
{
	shakingGuardList = [];

	//-------------------------------------------------------------------------
	// Shake time extension when guard in hole,
	// so the runner can dig three hold for three guards and pass through them.
	// The behavior almost same as original lode runner (APPLE-II version).
	// 2016/06/04
	//-------------------------------------------------------------------------
	if(curAiVersion <= 3) shakeTime = [ 36,  3,  3,  3,  3,  3 ]; //for AI VERSION = 3
	else                  shakeTime = [ 51,  3,  3,  3,  3,  3 ]; //for AI VERSION > 3
}

function add2GuardShakeQueue(id, shape)
{
	var curGuard = guard[id];

	if(shape == "shakeRight") {
		curGuard.shapeFrame = shakeRight;
	} else {
		curGuard.shapeFrame = shakeLeft;
	}

	curGuard.curFrameIdx  =  0;
	curGuard.curFrameTime = -1; //for init

	shakingGuardList.push(id);
	//error("push id =" + id + "(" + shakingGuardList + ")" );

}

function processGuardShake()
{
	var curGuard, curIdx;
	for(var i = 0; i < shakingGuardList.length;) {
		curGuard = guard[shakingGuardList[i]];
		curIdx = curGuard.curFrameIdx;

		if( curGuard.curFrameTime < 0) { //start shake => set still frame
			curGuard.curFrameTime = 0;
			curGuard.sprite.gotoAndStop(curGuard.shapeFrame[curIdx]);
		} else {
			if(++curGuard.curFrameTime >= shakeTime[curIdx]) {
				if(++curGuard.curFrameIdx < curGuard.shapeFrame.length) {
					//change frame
					curGuard.curFrameTime = 0;
					curGuard.sprite.gotoAndStop(curGuard.shapeFrame[curGuard.curFrameIdx]);
				} else {
					//shake time out

					var id = shakingGuardList[i];
					shakingGuardList.splice(i, 1); //remove from list
					//error("remove id =" + id + "(" + shakingGuardList + ")" );
					climbOut(id); //climb out
					continue;
				}

			}
		}
		i++;
	}
}

function removeFromShake(id)
{
	for(var i = 0; i < shakingGuardList.length;i++) {
		if(shakingGuardList[i] == id) {
			shakingGuardList.splice(i, 1); //remove from list
			//error("remove id =" + id + "(" + shakingGuardList + ")" );
			return;
		}
	}
	error("design error id =" + id + "(" + shakingGuardList + ")" );
}

//======================
// END NEW SHAKE METHOD
//======================

function climbOut(id)
{
	var curGuard = guard[id]

	curGuard.action = ACT_CLIMB_OUT;
	curGuard.sprite.removeAllEventListeners ("animationend");
	curGuard.sprite.gotoAndPlay("runUpDn");
	curGuard.shape = "runUpDn";
	curGuard.holePos = {x: curGuard.pos.x, y: curGuard.pos.y };

	if(DEBUG_TIME) loadingTxt.text = "ShakeTime = " + (recordCount - shakeTimeStart); //for debug
}

function bestMove(id)
{
	var guarder = guard[id];
	var x = guarder.pos.x;
	var xOffset = guarder.pos.xOffset;
	var y = guarder.pos.y;
	var yOffset = guarder.pos.yOffset;

	var curToken, nextBelow, nextMove;
	var checkSameLevelOnly = 0;

	curToken = map[x][y].base;

	if(guarder.action == ACT_CLIMB_OUT)  { //clib from hole
		if(guarder.pos.y == guarder.holePos.y) {
			return (ACT_UP);
		}else {
			checkSameLevelOnly = 1;
			if(guarder.pos.x != guarder.holePos.x) { //out of hole
				guarder.action = ACT_LEFT;
			}
		}
	}

	if( !checkSameLevelOnly) {

		/****** next check to see if enm must fall. if so ***********/
		/****** return e_fall and skip the rest.          ***********/

		if ( curToken == LADDR_T || (curToken == BAR_T && yOffset === 0) ) { //ladder & bar
			/* no guard fall */
		} else if ( yOffset < 0) //no laddr & yOffset < 0 ==> falling
			return (ACT_FALL);
		else if ( y < maxTileY )
		{
			nextBelow = map[x][y+1].act;

			if ( (nextBelow == EMPTY_T || nextBelow == RUNNER_T )) {
				return (ACT_FALL);
			} else if ( nextBelow == BLOCK_T || nextBelow == SOLID_T ||
					  nextBelow == GUARD_T || nextBelow == LADDR_T ) {
				/* no guard fall */
			} else {
				return ( ACT_FALL );
			}
		}
	}

	/******* next check to see if palyer on same floor *********/
	/******* and whether enm can get him. Ignore walls *********/
	var runnerX = runner.pos.x;
	var runnerY = runner.pos.y;

//	if ( y == runnerY ) { // same floor with runner
	if ( y == runnerY && runner.action != ACT_FALL) { //case : guard on laddr and falling => don't catch it
		while ( x != runnerX ) {
			if ( y < maxTileY )
				nextBelow = map[x][y+1].base;
			else nextBelow = SOLID_T;

			curToken = map[x][y].base;

			if ( curToken == LADDR_T || curToken == BAR_T ||  // go through
				 nextBelow == SOLID_T || nextBelow == LADDR_T ||
				 nextBelow == BLOCK_T || map[x][y+1].act == GUARD_T || //fixed: must check map[].act with guard_t (for support champLevel:43)
			     nextBelow == BAR_T || nextBelow == GOLD_T) //add BAR_T & GOLD_T for support level 92
			{
				if ( x < runnerX)  // guard left to runner
					++x;
				else if ( x > runnerX )
					--x;      // guard right to runner
			} else break;     // exit loop with closest x if no path to runner
		}

		if ( x == runnerX )  // scan for a path ignoring walls is a success
		{
			if (guarder.pos.x < runnerX ) {  //if left of man go right else left
				nextMove = ACT_RIGHT;
			} else if ( guarder.pos.x > runnerX ) {
				nextMove = ACT_LEFT;
			} else { // guard X = runner X
				if ( guarder.pos.xOffset < runner.pos.xOffset )
					nextMove = ACT_RIGHT;
				else
					nextMove = ACT_LEFT;
			}
			return (nextMove);
		}
	} // if ( y == runnerY ) { ...

	/********** If can't reach man on current level, then scan floor *********/
	/********** (ignoring walls) and look up and down for best move  *********/

	return scanFloor(id);
}

var bestPath, bestRating, curRating;
var leftEnd, rightEnd;
var startX, startY;

function scanFloor(id)
{
	var x, y;
	var curToken, nextBelow;
	var curPath;

	x = startX = guard[id].pos.x;
	y = startY = guard[id].pos.y;

	bestRating = 255;   // start with worst rating
	curRating = 255;
	bestPath = ACT_STOP;

	/****** get ends for search along floor ******/

	while ( x > 0 ) {                                    //get left end first
		curToken = map[x-1][y].act;
		if ( curToken == BLOCK_T || curToken == SOLID_T )
			break;
		if ( curToken == LADDR_T || curToken == BAR_T || y >= maxTileY ||
		     y < maxTileY && ( ( nextBelow = map[x-1][y+1].base) == BLOCK_T ||
		     nextBelow == SOLID_T || nextBelow == LADDR_T ) )
			--x;
		else {
			--x;                                        // go on left anyway
			break;
		}
	}

	leftEnd = x;
	x = startX;
	while ( x < maxTileX ) {                           // get right end next
		curToken = map[x+1][y].act;
		if ( curToken  == BLOCK_T || curToken == SOLID_T )
			break;

		if ( curToken == LADDR_T || curToken == BAR_T || y >= maxTileY ||
		     y < maxTileY && ( ( nextBelow = map[x+1][y+1].base) == BLOCK_T ||
		     nextBelow == SOLID_T || nextBelow == LADDR_T ) )
			++x;
		else {                                         // go on right anyway
			++x;
			break;
		}
	}

	rightEnd = x;

	/******* Do middle scan first for best rating and direction *******/

	x = startX;
	if ( y < maxTileY &&
		 (nextBelow = map[x][y+1].base) != BLOCK_T && nextBelow != SOLID_T )
		scanDown( x, ACT_DOWN );

	if( map[x][y].base == LADDR_T )
		scanUp( x, ACT_UP );

	/******* next scan both sides of floor for best rating *******/

	curPath = ACT_LEFT;
	x = leftEnd;

	while ( true ) {
		if ( x == startX ) {
			if ( curPath == ACT_LEFT && rightEnd != startX ) {
				curPath = ACT_RIGHT;
				x = rightEnd;
			}
			else break;
		}

		if( y < maxTileY &&
			(nextBelow = map [x][y+1].base) != BLOCK_T && nextBelow != SOLID_T )
			scanDown (x, curPath );

		if( map[x][y].base == LADDR_T )
			scanUp ( x, curPath );

		if ( curPath == ACT_LEFT )
			x++;
		else x--;
	}


	return ( bestPath );
}                           // end scan floor for best direction to go

function scanDown(x, curPath )
{
	var y;
	var nextBelow; //curRating;
	var runnerX = runner.pos.x;
	var runnerY = runner.pos.y;

	y = startY;

	while( y < maxTileY && ( nextBelow = map [x][y+1].base) != BLOCK_T &&
		    nextBelow != SOLID_T )                  // while no floor below ==> can move down
	{
		if ( map[x][y].base != EMPTY_T && map[x][y].base != HLADR_T) { // if not falling ==> try move left or right
			//************************************************************************************
			// 2014/04/14 Add check  "map[x][y].base != HLADR_T" for support
			// champLevel 19: a guard in hole with h-ladder can run left after dig the left hole
			//************************************************************************************
			if ( x > 0 ) {                          // if not at left edge check left side
				if ( (nextBelow = map[x-1][y+1].base) == BLOCK_T ||
					nextBelow == LADDR_T || nextBelow == SOLID_T ||
					map[x-1][y].base == BAR_T )     // can move left
				{
					if ( y >= runnerY )             // no need to go on
						break;                      // already below runner
				}
			}

			if ( x < maxTileX )                     // if not at right edge check right side
			{
				if ( (nextBelow = map[x+1][y+1].base) == BLOCK_T ||
					nextBelow == LADDR_T || nextBelow == SOLID_T ||
					map[x+1][y].base == BAR_T )     // can move right
				{
					if ( y >= runnerY )
						break;
				}
			}
		}                                           // end if not falling
		++y;                                        // go to next level down
	}                                               // end while ( y < maxTileY ... ) scan down

	if( y == runnerY ) {                            // update best rating and direct.
		curRating = Math.abs(startX - x);
//		if ( (curRating = runnerX - x) < 0) //BUG from original book ? (changed by Simon)
//			curRating = -curRating; //ABS
	} else if ( y > runnerY )
		curRating = y - runnerY + 200;               // position below runner
	else curRating = runnerY - y + 100;              // position above runner

	if( curRating < bestRating )
	{
		bestRating = curRating;
		bestPath = curPath;
	}

}                                                   // end Scan Down

function scanUp( x, curPath )
{
	var y;
	var nextBelow; //curRating;
	var runnerX = runner.pos.x;
	var runnerY = runner.pos.y;

	y = startY;

	while ( y > 0 && map[x][y].base == LADDR_T ) {  // while can go up
		--y;
		if ( x > 0 ) {                              // if not at left edge check left side
			if ( (nextBelow = map[x-1][y+1].base) == BLOCK_T ||
				nextBelow == SOLID_T || nextBelow == LADDR_T ||
				map[x-1][y].base == BAR_T )         // can move left
			{
				if ( y <= runnerY )                 // no need to go on
					break;                          // already above runner
			}
		}

		if ( x < maxTileX ) {                       // if not at right edge check right side
			if ( (nextBelow = map[x+1][y+1].base) == BLOCK_T ||
				nextBelow == SOLID_T || nextBelow == LADDR_T ||
				map[x+1][y].base == BAR_T )         // can move right
			{
				if ( y <= runnerY )
					break;
			}
		}
		//--y;
	}                                               // end while ( y > 0 && laddr up) scan up

	if ( y == runnerY ) {                           // update best rating and direct.
		curRating = Math.abs(startX - x);
		//if ( (curRating = runnerX - x) < 0) // BUG from original book ? (changed by Simon)
		//	curRating = -curRating; //ABS
	} else if ( y > runnerY )
		curRating = y - runnerY + 200;              // position below runner
	else curRating = runnerY - y + 100;             // position above runner

	if ( curRating < bestRating )
	{
		bestRating = curRating;
		bestPath = curPath;
	}

}                                                   // end scan Up

var bornRndX; //range random 0..maxTileX

function initRnd()
{
	//bornRndX = new rangeRandom(0, maxTileX, curLevel); //set fixed seed for demo mode
	bornRndX = new rangeRandom(0, maxTileX, 0); //random range 0 .. maxTileX
}

function getGuardId(x, y)
{
	var id;

	for(id = 0; id < guardCount; id++) {
		if ( guard[id].pos.x == x && guard[id].pos.y == y) break;
	}
	assert(id < guardCount, "Error: can not get guard position!");

	return id;
}

function guardReborn(x, y)
{
	var id;

	//get guard id  by current in hole position
	id = getGuardId(x, y);

	var bornY = 1; //start on line 2
	var bornX = bornRndX.get();
	var rndStart = bornX;


	while(map[bornX][bornY].act != EMPTY_T || map[bornX][bornY].base == GOLD_T || map[bornX][bornY].base == BLOCK_T ) {
		//BUG FIXED for level 115 (can not reborn at bornX=27)
		//don't born at gold position & diged position, 2/24/2015
		if( (bornX = bornRndX.get()) == rndStart) {
			bornY++;
		}
		assert(bornY <= maxTileY, "Error: Born Y too large !");
	}
	//debug("bornX = " + bornX);
	if(playMode == PLAY_AUTO || playMode == PLAY_DEMO || playMode == PLAY_DEMO_ONCE) {
		var bornPos = getDemoBornPos();
		bornX = bornPos.x;
		bornY = bornPos.y;
	}

	if(recordMode == RECORD_KEY) saveRecordBornPos(bornX, bornY);
	else if(recordMode == RECORD_PLAY) {
		var bornPos = getRecordBornPos();
		bornX = bornPos.x;
		bornY = bornPos.y;
	}

	map[bornX][bornY].act = GUARD_T;
	//debug("born (x,y) = (" + bornX + "," + bornY + ")");

	var curGuard = guard[id];

	curGuard.pos = { x:bornX, y:bornY, xOffset:0, yOffset: 0 };
	curGuard.sprite.x = bornX * tileWScale | 0;
	curGuard.sprite.y = bornY * tileHScale | 0;

	rebornTimeStart = recordCount;
	if(curAiVersion < 3) {
		curGuard.sprite.on("animationend", function() { rebornComplete(id); });
		curGuard.sprite.gotoAndPlay("reborn");
	} else {
		add2RebornQueue(id);
	}

	curGuard.shape = "reborn";
	curGuard.action = ACT_REBORN;

}

function rebornComplete(id)
{
	var x = guard[id].pos.x;
	var y = guard[id].pos.y;

	if( map[x][y].act == RUNNER_T) setRunnerDead(); //collision
	map[x][y].act  = GUARD_T;
	guard[id].sprite.removeAllEventListeners ("animationend");
	guard[id].action = ACT_FALL;
	guard[id].shape = "fallRight";
	//guard[id].hasGold = 0;
	guard[id].sprite.gotoAndPlay("fallRight");
	themeSoundPlay("reborn");

	if(DEBUG_TIME) loadingTxt.text = "rebornTime = " + (recordCount - rebornTimeStart); //for debug
}

function setRunnerDead()
{
	if(!godMode) gameState = GAME_RUNNER_DEAD;
}

//===============================================
// BEGIN NEW FOR REBORN (ai version >= 3)
//===============================================
var rebornFrame = [ 28, 29 ];
var rebornTime  = [  6,  2 ];

var rebornGuardList = [];

function initRebornVariable()
{
	rebornGuardList = [];
}

function add2RebornQueue(id)
{
	var curGuard = guard[id];

	curGuard.sprite.gotoAndStop("reborn");
	curGuard.curFrameIdx  =   0;
	curGuard.curFrameTime =  -1;

	rebornGuardList.push(id);
}

function processReborn()
{
	var curGuard, curIdx;

	for(var i = 0; i < rebornGuardList.length;) {
		curGuard = guard[rebornGuardList[i]];
		curIdx = curGuard.curFrameIdx;

		if(++curGuard.curFrameTime >= rebornTime[curIdx]) {
			if(++curGuard.curFrameIdx < rebornFrame.length) {
				//change frame
				curGuard.curFrameTime = 0;
				curGuard.sprite.gotoAndStop(rebornFrame[curGuard.curFrameIdx]);
			} else {
				//reborn
				var id = rebornGuardList[i];
				rebornGuardList.splice(i, 1); //remove from list
				rebornComplete(id);
				continue;
			}
		}
		i++;
	}
}
//====================
// END NEW FOR REBORN
//====================

  function loadLevel() {
    runner = null; guard = []; goldCount = guardCount = goldComplete = 0;
    keyAction = ACT_STOP;
    holeObj = {sprite: new Sprite('hole', 0), action: ACT_STOP, digLimit: 8};
    initGuardVariable(); initStillFrameVariable();
    // Keep the upstream shuffled-column respawn search deterministic across saves.
    const columns = Array.from({length:28}, (_, i) => i);
    for (let i = 27; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [columns[i], columns[j]] = [columns[j], columns[i]];
    }
    bornRndX = {columns, index:0, get() {
      const x = this.columns[this.index];
      this.index = (this.index + 1) % 28;
      return x;
    }};
    movePolicy[1] = [0, 1, 0, 1, 0, 1];
    buildLevelMap(levels[curLevel - 1]);
    if (!goldCount) showHideLaddr();
    phase = 'ready'; gameState = GAME_START;
  }
  function objects() {
    const objects = [];
    for (const column of map) for (const cell of column) if (cell.bitmap) objects.push(cell.bitmap);
    objects.push(...guard.map(g => g.sprite), runner.sprite, ...fillHoleObj);
    if (holeObj.action === ACT_DIGGING) objects.push(holeObj.sprite);
    return objects;
  }
  function tick(action = 0) {
    if (phase === 'over' || phase === 'won') return;
    if (phase === 'dead' || phase === 'clear') {
      if (--waitTicks > 0) return;
      if (phase === 'dead') {
        if (runnerLife <= 0) { phase = 'over'; return; }
      } else {
        runnerLife = Math.min(100, runnerLife + 1);
        if (curLevel === levels.length) { phase = 'won'; return; }
        curLevel++;
      }
      loadLevel(); return;
    }
    keyAction = action;
    if (phase === 'ready') {
      if (!action) return;
      phase = 'playing'; gameState = GAME_RUNNING;
    }
    recordCount++;
    if (goldComplete && runner.pos.y === 0 && runner.pos.yOffset === 0) {
      phase = 'clear'; waitTicks = 28; curScore += SCORE_COMPLETE_LEVEL;
      soundStop('fall'); sound('pass'); return;
    }
    if (!isDigging()) moveRunner(); else processDigHole();
    if (gameState !== GAME_RUNNER_DEAD) moveGuard();
    processGuardShake(); processFillHole(); processReborn();
    for (const object of objects()) object.tick();
    if (gameState === GAME_RUNNER_DEAD) {
      runnerLife--; phase = 'dead'; waitTicks = 18;
      soundStop('fall'); soundStop('dig'); sound('dead');
    }
  }
  function retry() {
    if (phase !== 'ready' && phase !== 'playing') return;
    runnerLife--; phase = 'dead'; waitTicks = 18;
    soundStop('fall'); soundStop('dig'); sound('dead');
  }
  function snapshot() {
    return JSON.parse(JSON.stringify({
      version: 1, level: curLevel - 1, score: curScore, lives: runnerLife, phase, waitTicks,
      map, runner, guards: guard, goldCount, goldComplete, hole: holeObj,
      fills: fillHoleObj, shaking: shakingGuardList, reborn: rebornGuardList,
      moveOffset, moveId, recordCount, rng,
      born: {columns:bornRndX.columns, index:bornRndX.index},
    }));
  }
  function restore(saved) {
    const sprite = data => Object.assign(new Sprite(data.spriteSheet), data);
    curLevel = saved.level + 1; curScore = saved.score; runnerLife = saved.lives;
    phase = saved.phase; waitTicks = saved.waitTicks;
    map = saved.map.map(column => column.map(cell => ({...cell, bitmap:cell.bitmap ? sprite(cell.bitmap) : null})));
    runner = {...saved.runner, pos:{...saved.runner.pos}, sprite:sprite(saved.runner.sprite)};
    guard = saved.guards.map(actor => ({...actor, pos:{...actor.pos}, sprite:sprite(actor.sprite)}));
    guardCount = guard.length; goldCount = saved.goldCount; goldComplete = saved.goldComplete;
    holeObj = {...saved.hole, sprite:sprite(saved.hole.sprite)};
    fillHoleObj = saved.fills.map(sprite);
    shakingGuardList = [...saved.shaking]; rebornGuardList = [...saved.reborn];
    moveOffset = saved.moveOffset; moveId = saved.moveId; recordCount = saved.recordCount;
    rng = saved.rng; bornRndX.columns = [...saved.born.columns]; bornRndX.index = saved.born.index;
    gameState = phase === 'ready' ? GAME_START : GAME_RUNNING;
    keyAction = ACT_STOP;
  }
  loadLevel();
  return {
    tick, retry, snapshot, restore, objects,
    get level() { return curLevel - 1; },
    get score() { return curScore; },
    get lives() { return runnerLife; },
    get phase() { return phase; },
    get gold() { return goldCount; },
  };
}
