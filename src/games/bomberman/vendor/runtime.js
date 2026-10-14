// Adapted from danielcspaiva/Bomberman-Clone, commit 63e2838212227bbcdcb6aa6f6b19c550987bd449.
// Original map, collision, sprite and enemy movement; Scene owns input, audio and time.
export function createBomberman(canvas, assets, text, play = () => {}) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Cannot create Bomberman canvas');
  context.imageSmoothingEnabled = false;
  const {
    superBomberman,
    solidBlock,
    field,
    wall,
    bomb,
    explosion,
    enemy,
    cleanStatusBar,
    whiteHead,
    blackHead,
    heart,
    items,
  } = assets;
  const gridWidth = 50,
    gridHeigth = 50,
    offset = 50;
  let players = 1,
    phase = 'menu',
    frames = 0,
    randMap = [],
    enemies = [],
    bombs = [],
    flames = [],
    winner = 0;
  const mapMenu = [
    // MAPA TEMPLATE 2
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const map1 = [
    // MAPA MENU
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const map2 = [
    // MAPA TEMPLATE 3
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const renderMap = (map) => {
    // FUNCAO PARA RENDERIZAR O MAPA
    for (let j = 0; j < map.length; j += 1) {
      for (let i = 0; i < map[0].length; i += 1) {
        context.drawImage(
          field,
          i * gridWidth,
          j * gridHeigth + offset,
          50,
          50,
        );
        switch (map[j][i]) {
          case 1: //SOLID BLOCK
            context.drawImage(
              solidBlock,
              i * gridWidth,
              j * gridHeigth + offset,
              50,
              50,
            );
            break;
          case 2: // WALL
            context.drawImage(
              wall,
              i * gridWidth,
              j * gridHeigth + offset,
              50,
              50,
            );
            break;
          case 3: // BOMB
            context.drawImage(
              bomb,
              0,
              0,
              19,
              20,
              i * gridWidth,
              j * gridHeigth + offset,
              50,
              50,
            );
            break;
          case 4: // EXPLOSION
            context.drawImage(
              explosion,
              45,
              0,
              20,
              20,
              i * gridWidth,
              j * gridHeigth + offset,
              50,
              50,
            );
            break;
          case 5: // POWER UP 1
            context.drawImage(
              items,
              0,
              0,
              16,
              16,
              i * gridWidth + 10,
              j * gridHeigth + offset + 10,
              30,
              30,
            );
            break;
          case 6: // POWER UP 2
            context.drawImage(
              items,
              34,
              0,
              16,
              16,
              i * gridWidth + 10,
              j * gridHeigth + offset + 10,
              30,
              30,
            );
            break;
          case 7: // POWER UP 3
            context.drawImage(
              items,
              18,
              0,
              16,
              16,
              i * gridWidth + 10,
              j * gridHeigth + offset + 10,
              30,
              30,
            );
            break;
        }
      }
    }
  };

  const clear = () => {
    // FUNCAO PARA LIMPAR O CANVAS
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const statusBar = () => {
    context.drawImage(cleanStatusBar, 50, 0, 650, 50);
    context.drawImage(solidBlock, 0, 0, 50, 50);
    context.drawImage(solidBlock, 700, 0, 50, 50);
    context.drawImage(whiteHead, 65, 10, 30, 30);
    context.fillStyle = 'white';
    context.drawImage(heart, 103, 13, 25, 25);
    context.fillText(`${newPlayer.health}`, 135, 33);
    context.drawImage(items, 0, 0, 16, 16, 210, 10, 30, 30);
    context.font = '16px monospace';
    context.fillText(`${newPlayer.bombPower}`, 230, 40);
    context.drawImage(items, 34, 0, 16, 16, 255, 10, 30, 30);
    context.fillText(`${newPlayer.speed - 1}`, 275, 40);
    context.drawImage(items, 18, 0, 16, 16, 300, 10, 30, 30);
    context.fillText(`${newPlayer.bombs}`, 320, 40);
    if (newPlayer2) {
      context.drawImage(heart, 545, 13, 25, 25);
      context.drawImage(blackHead, 650, 10, 30, 30);
      context.font = '26px monospace';
      context.fillText(`${newPlayer2.health}`, 578, 33);
      context.font = '16px monospace';
      context.drawImage(items, 0, 0, 16, 16, 410, 10, 30, 30);
      context.fillText(`${newPlayer2.bombPower}`, 430, 40);
      context.drawImage(items, 34, 0, 16, 16, 455, 10, 30, 30);
      context.fillText(`${newPlayer2.speed - 1}`, 470, 40);
      context.drawImage(items, 18, 0, 16, 16, 500, 10, 30, 30);
      context.fillText(`${newPlayer2.bombs}`, 520, 40);
    }
    if (!newPlayer2) {
      context.drawImage(enemy, 0, 0, 22, 36, 655, -2, 22 * 1.3, 36 * 1.3);
      context.font = '26px monospace';
      if (newPlayer.enemiesKilled < 10) {
        context.fillText(`0${newPlayer.enemiesKilled}`, 608, 32);
      } else {
        context.fillText(`${newPlayer.enemiesKilled}`, 608, 32);
      }
    }
    context.font = '26px monospace';
  };

  class Player {
    // CLASE PLAYER
    constructor(x, y, color, healthPosition, health, name, img) {
      this.name = name;
      this.healthPosition = healthPosition;
      this.x = x;
      this.y = y;
      this.color = color;
      this.speed = 2;
      this.speedX = 0;
      this.speedY = 0;
      this.size = 30;
      this.gridY = Math.floor((this.y + this.size / 2) / gridHeigth);
      this.gridX = Math.floor((this.x + this.size / 2) / gridWidth);
      this.bombs = 1;
      this.bombPower = 1;
      this.health = health;
      this.left = this.right = this.up = false;
      this.down = false;
      this.srcx = 0;
      this.srcy = 0;
      this.width = 16;
      this.height = 24;
      this.img = img;
      this.direction = Math.floor(Math.random() * 4);
      this.countAnim = 0;
      this.enemiesKilled = 0;
    }

    update() {
      context.fillStyle = this.color;

      context.drawImage(
        assets[this.img],
        this.srcx,
        this.srcy,
        this.width,
        this.height,
        this.x,
        this.y - 20 + offset,
        this.width * 2.1,
        this.height * 2.1,
      );
    }

    newPos() {
      this.x += this.speedX;
      this.gridX = Math.floor((this.x + this.size / 2) / gridWidth);

      this.y += this.speedY;
      this.gridY = Math.floor((this.y + this.size / 2) / gridHeigth);

      // CHECKS COLLISION DETECTION
      if (
        randMap[this.gridY - 1][this.gridX] !== 0 &&
        randMap[this.gridY - 1][this.gridX] !== 4 &&
        randMap[this.gridY - 1][this.gridX] !== 5 &&
        randMap[this.gridY - 1][this.gridX] !== 6 &&
        randMap[this.gridY - 1][this.gridX] !== 7 &&
        this.y < this.gridY * gridHeigth
      ) {
        // COLISAO ACIMA
        this.y = this.gridY * gridHeigth;
      }
      if (
        randMap[this.gridY + 1][this.gridX] !== 0 &&
        randMap[this.gridY + 1][this.gridX] !== 4 &&
        randMap[this.gridY + 1][this.gridX] !== 5 &&
        randMap[this.gridY + 1][this.gridX] !== 6 &&
        randMap[this.gridY + 1][this.gridX] !== 7 &&
        this.y + this.size > (this.gridY + 1) * gridHeigth
      ) {
        // COLISAO ABAIXO
        this.y = this.gridY * gridHeigth + gridHeigth - this.size;
      }
      if (
        randMap[this.gridY][this.gridX - 1] !== 0 &&
        randMap[this.gridY][this.gridX - 1] !== 4 &&
        randMap[this.gridY][this.gridX - 1] !== 5 &&
        randMap[this.gridY][this.gridX - 1] !== 6 &&
        randMap[this.gridY][this.gridX - 1] !== 7 &&
        this.x < this.gridX * gridWidth
      ) {
        // COLISAO A ESQUERDA
        this.x = this.gridX * gridWidth;
      }
      if (
        randMap[this.gridY][this.gridX + 1] !== 0 &&
        randMap[this.gridY][this.gridX + 1] !== 4 &&
        randMap[this.gridY][this.gridX + 1] !== 5 &&
        randMap[this.gridY][this.gridX + 1] !== 6 &&
        randMap[this.gridY][this.gridX + 1] !== 7 &&
        this.x + this.size > (this.gridX + 1) * gridWidth
      ) {
        // COLISAO A DIREITA
        this.x = this.gridX * gridWidth + gridWidth - this.size;
      }

      if (randMap[this.gridY][this.gridX] === 5) {
        this.bombPower += 1;
        randMap[this.gridY][this.gridX] = 0;
      }

      if (randMap[this.gridY][this.gridX] === 6) {
        this.speed += 1;
        randMap[this.gridY][this.gridX] = 0;
      }

      if (randMap[this.gridY][this.gridX] === 7) {
        this.bombs += 1;
        randMap[this.gridY][this.gridX] = 0;
      }
    }

    sprites() {
      if (this.down) {
        this.srcy = 0;
      }
      if (this.right) {
        this.srcy = 26;
      }
      if (this.up) {
        this.srcy = 51;
      }
      if (this.left) {
        this.srcy = 76;
      }
      if (this.down || this.right || this.up || this.left) {
        this.countAnim += 1;
        if (this.countAnim > 25) this.countAnim = 0;
        this.srcx = Math.floor(this.countAnim / 5) * (this.width + 1);
      }
    }

    randomMove() {
      switch (this.direction) {
        case 0:
          this.x += 1;
          this.gridX = Math.floor((this.x + this.size / 2) / gridWidth);
          if (
            randMap[this.gridY][this.gridX + 1] !== 0 &&
            randMap[this.gridY][this.gridX + 1] !== 4 &&
            this.x + this.size > (this.gridX + 1) * gridWidth
          ) {
            // COLISAO A DIREITA
            this.x = this.gridX * gridWidth + gridWidth - this.size;
            this.direction = Math.floor(Math.random() * 4);
          }
          break;
        case 1:
          this.x -= 1;
          this.gridX = Math.floor((this.x + this.size / 2) / gridWidth);
          if (
            randMap[this.gridY][this.gridX - 1] !== 0 &&
            randMap[this.gridY][this.gridX - 1] !== 4 &&
            this.x < this.gridX * gridWidth
          ) {
            // COLISAO A ESQUERDA
            this.x = this.gridX * gridWidth;
            this.direction = Math.floor(Math.random() * 4);
          }
          break;
        case 2:
          this.y += 1;
          this.gridY = Math.floor((this.y + this.size / 2) / gridHeigth);
          if (
            randMap[this.gridY + 1][this.gridX] !== 0 &&
            randMap[this.gridY + 1][this.gridX] !== 4 &&
            this.y + this.size > (this.gridY + 1) * gridHeigth
          ) {
            // COLISAO ABAIXO
            this.y = this.gridY * gridHeigth + gridHeigth - this.size;
            this.direction = Math.floor(Math.random() * 4);
          }
          break;
        case 3:
          this.y -= 1;
          this.gridY = Math.floor((this.y + this.size / 2) / gridHeigth);
          if (
            randMap[this.gridY - 1][this.gridX] !== 0 &&
            randMap[this.gridY - 1][this.gridX] !== 4 &&
            this.y < this.gridY * gridHeigth
          ) {
            // COLISAO ACIMA
            this.y = this.gridY * gridHeigth;
            this.direction = Math.floor(Math.random() * 4);
          }
          break;
      }
    }
  }

  let newPlayer = new Player(60, 60, 'white', 135, 100, 'P1', 'bomberman');
  let newPlayer2 = null;
  const directions = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const tile = (x, y) => randMap[y]?.[x] ?? 1;
  const start = () => {
    randMap = (Math.random() < 0.5 ? map1 : map2).map((row) =>
      row.map((cell) => (cell === 0 && Math.random() > 0.7 ? 2 : cell)),
    );
    for (const [x, y] of [
      [1, 1],
      [1, 2],
      [2, 1],
      [13, 9],
      [13, 8],
      [12, 9],
    ])
      randMap[y][x] = 0;
    newPlayer = new Player(60, 60, 'white', 135, 100, 'P1', 'bomberman');
    newPlayer2 =
      players === 2
        ? new Player(660, 460, 'white', 550, 100, 'P2', 'bomberman2')
        : null;
    phase = 'playing';
    frames = 0;
    enemies = [];
    bombs = [];
    flames = [];
    winner = 0;
    play('start');
  };
  const place = (player, owner) => {
    if (!player || player.bombs <= 0 || tile(player.gridX, player.gridY) !== 0)
      return;
    player.bombs--;
    randMap[player.gridY][player.gridX] = 3;
    bombs.push({
      x: player.gridX,
      y: player.gridY,
      power: Math.min(3, player.bombPower),
      owner,
      remaining: 2300,
    });
    play('place');
  };
  const explode = (bomb) => {
    const cells = [[bomb.x, bomb.y]];
    for (const [dx, dy] of directions) {
      for (let distance = 1; distance <= bomb.power; distance++) {
        const x = bomb.x + dx * distance,
          y = bomb.y + dy * distance,
          cell = tile(x, y);
        if (cell === 1 || cell === 3 || cell >= 5) break;
        cells.push([x, y]);
        if (cell === 2) break;
      }
    }
    for (const [x, y] of cells) randMap[y][x] = 4;
    flames.push({ cells, remaining: 450 });
    const owner = bomb.owner === 1 ? newPlayer : newPlayer2;
    if (owner) owner.bombs++;
    play('explode');
  };
  const move = (player, input, prefix) => {
    if (!player) return;
    player.left = !!input[`${prefix}LEFT`];
    player.right = !!input[`${prefix}RIGHT`];
    player.up = !!input[`${prefix}UP`];
    player.down = !!input[`${prefix}DOWN`];
    player.speedX = (Number(player.right) - Number(player.left)) * player.speed;
    player.speedY = (Number(player.down) - Number(player.up)) * player.speed;
    player.newPos();
    player.sprites();
    // Keep upgrades within one tile per tick so collision checks cannot tunnel through walls.
    player.speed = Math.min(10, player.speed);
  };
  const damage = (player, amount) => {
    player.health = Math.max(0, player.health - amount);
    if (player.health === 0 && phase === 'playing') {
      phase = 'over';
      winner = players === 2 ? (player === newPlayer ? 2 : 1) : 0;
      play('over');
    }
  };
  function step(input, pressed, delta) {
    if (phase === 'menu') {
      if (pressed.UP) players = 1;
      if (pressed.DOWN) players = 2;
      if (pressed.MODE) players = players === 1 ? 2 : 1;
      if (pressed.START || pressed.DROP) start();
      return;
    }
    if (phase === 'over') return;
    if (delta === 0) {
      if (pressed.DROP) place(newPlayer, 1);
      if (pressed.P2_FIRE) place(newPlayer2, 2);
      return;
    }
    frames++;
    for (const flame of flames) flame.remaining -= delta;
    const expired = flames.filter((flame) => flame.remaining <= 0);
    flames = flames.filter((flame) => flame.remaining > 0);
    for (const flame of expired)
      for (const [x, y] of flame.cells) {
        if (
          tile(x, y) === 4 &&
          !flames.some((active) =>
            active.cells.some(([ax, ay]) => ax === x && ay === y),
          )
        )
          randMap[y][x] = 0;
      }
    for (const bomb of bombs) bomb.remaining -= delta;
    const due = bombs.filter((bomb) => bomb.remaining <= 0);
    bombs = bombs.filter((bomb) => bomb.remaining > 0);
    for (const bomb of due) explode(bomb);
    move(newPlayer, input, '');
    move(newPlayer2, input, 'P2_');
    if (pressed.DROP) place(newPlayer, 1);
    if (pressed.P2_FIRE) place(newPlayer2, 2);
    for (const player of [newPlayer, newPlayer2])
      if (player && tile(player.gridX, player.gridY) === 4) damage(player, 1);
    if (frames % 150 === 0) {
      const free = [];
      for (let y = 1; y < 10; y++)
        for (let x = 1; x < 14; x++)
          if (
            tile(x, y) === 0 &&
            ![newPlayer, newPlayer2].some(
              (p) => p && p.gridX === x && p.gridY === y,
            )
          )
            free.push([x, y]);
      if (free.length) {
        const [x, y] = free[Math.floor(Math.random() * free.length)];
        enemies.push(
          new Player(
            x * 50 + 10,
            y * 50 + 10,
            'white',
            100,
            5,
            'enemy',
            'enemy',
          ),
        );
      }
    }
    for (const foe of enemies) {
      foe.randomMove();
      for (const player of [newPlayer, newPlayer2])
        if (player && foe.gridX === player.gridX && foe.gridY === player.gridY)
          damage(player, 1);
      if (tile(foe.gridX, foe.gridY) === 4) {
        foe.health--;
        if (foe.health <= 0) {
          newPlayer.enemiesKilled++;
          if (Math.random() > 0.2)
            randMap[foe.gridY][foe.gridX] = 5 + Math.floor(Math.random() * 3);
        }
      }
    }
    enemies = enemies.filter((foe) => foe.health > 0);
  }
  function render() {
    clear();
    context.font = 'bold 26px monospace';
    context.fillStyle = 'white';
    if (phase === 'menu' || phase === 'over') {
      renderMap(mapMenu);
      for (let i = 0; i < 15; i++)
        context.drawImage(solidBlock, i * 50, 0, 50, 50);
      context.textAlign = 'center';
      if (phase === 'menu') {
        context.drawImage(superBomberman, 125, -50, 500, 500);
        context.fillText(text('start'), 375, 385);
        context.fillText(
          `${players === 1 ? '> ' : ''}${text('single')}`,
          375,
          445,
        );
        context.fillText(
          `${players === 2 ? '> ' : ''}${text('multi')}`,
          375,
          490,
        );
      } else {
        context.fillText(
          text(winner ? 'winner' : 'over', { player: winner }),
          375,
          250,
        );
        if (!winner)
          context.fillText(
            text('score', { score: newPlayer.enemiesKilled }),
            375,
            305,
          );
        context.fillText(text('restart'), 375, 360);
      }
      context.textAlign = 'left';
      return;
    }
    renderMap(randMap);
    statusBar();
    newPlayer.update();
    newPlayer2?.update();
    for (const foe of enemies)
      context.drawImage(
        enemy,
        3,
        3,
        19,
        30,
        foe.x,
        foe.y - 20 + offset,
        30,
        50,
      );
  }
  const packPlayer = (player) =>
    player
      ? Object.fromEntries(
          Object.entries(player).filter(
            ([key]) =>
              !['speedX', 'speedY', 'left', 'right', 'up', 'down'].includes(
                key,
              ),
          ),
        )
      : null;
  function snapshot() {
    if (phase === 'over') return null;
    return structuredClone({
      version: 1,
      phase,
      players,
      frames,
      randMap,
      newPlayer: packPlayer(newPlayer),
      newPlayer2: packPlayer(newPlayer2),
      enemies: enemies.map(packPlayer),
      bombs,
      flames,
      winner,
    });
  }
  function restore(saved) {
    try {
      if (
        saved?.version !== 1 ||
        !['menu', 'playing'].includes(saved.phase) ||
        ![1, 2].includes(saved.players) ||
        !Number.isInteger(saved.frames) ||
        saved.frames < 0 ||
        saved.winner !== 0
      )
        return false;
      const validMap =
        saved.randMap.length === 11 &&
        saved.randMap.every(
          (row, y) =>
            Array.isArray(row) &&
            row.length === 15 &&
            row.every(
              (cell, x) =>
                Number.isInteger(cell) &&
                cell >= 0 &&
                cell <= 7 &&
                (!(x === 0 || x === 14 || y === 0 || y === 10) || cell === 1),
            ),
        );
      if (saved.phase === 'playing' ? !validMap : saved.randMap.length !== 0)
        return false;
      const hydrate = (data, img) => {
        const player = new Player(60, 60, 'white', 135, 100, 'P1', img);
        if (!data || data.img !== img) throw new Error('Invalid player');
        for (const [key, value] of Object.entries(packPlayer(player))) {
          const item = data[key];
          if (
            typeof item !== typeof value ||
            (typeof item === 'number' && !Number.isFinite(item))
          )
            throw new Error('Invalid player value');
          player[key] = item;
        }
        if (
          player.x < 50 ||
          player.x > 670 ||
          player.y < 50 ||
          player.y > 470 ||
          player.size !== 30 ||
          player.width !== 16 ||
          player.height !== 24 ||
          ![0, 17, 34, 51, 68, 85].includes(player.srcx) ||
          ![0, 26, 51, 76].includes(player.srcy) ||
          !Number.isInteger(player.countAnim) ||
          player.countAnim < 0 ||
          player.countAnim > 25 ||
          player.speed < 2 ||
          player.speed > 10 ||
          player.health <= 0 ||
          player.health > 100 ||
          !Number.isInteger(player.bombs) ||
          player.bombs < 0 ||
          player.bombs > 10000 ||
          !Number.isInteger(player.bombPower) ||
          player.bombPower < 1 ||
          player.bombPower > 10000 ||
          !Number.isInteger(player.enemiesKilled) ||
          player.enemiesKilled < 0 ||
          player.gridX !== Math.floor((player.x + 15) / 50) ||
          player.gridY !== Math.floor((player.y + 15) / 50) ||
          player.direction < 0 ||
          player.direction > 3 ||
          !Number.isInteger(player.direction)
        )
          throw new Error('Invalid player bounds');
        return player;
      };
      const p1 = hydrate(saved.newPlayer, 'bomberman');
      const p2 =
        saved.players === 2 && saved.phase === 'playing'
          ? hydrate(saved.newPlayer2, 'bomberman2')
          : null;
      if (!Array.isArray(saved.enemies) || saved.enemies.length > 10000)
        return false;
      const foes = saved.enemies.map((data) => hydrate(data, 'enemy'));
      const cell = (x, y) =>
        Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 1 &&
        x <= 13 &&
        y >= 1 &&
        y <= 9;
      if (
        !Array.isArray(saved.bombs) ||
        saved.bombs.length > 10000 ||
        !saved.bombs.every(
          (b) =>
            cell(b.x, b.y) &&
            [1, 2].includes(b.owner) &&
            b.owner <= saved.players &&
            [1, 2, 3].includes(b.power) &&
            Number.isFinite(b.remaining) &&
            b.remaining > 0 &&
            b.remaining <= 2300 &&
            saved.randMap[b.y]?.[b.x] === 3,
        )
      )
        return false;
      if (
        !Array.isArray(saved.flames) ||
        saved.flames.length > 10000 ||
        !saved.flames.every(
          (f) =>
            Number.isFinite(f.remaining) &&
            f.remaining > 0 &&
            f.remaining <= 450 &&
            Array.isArray(f.cells) &&
            f.cells.length <= 13 &&
            f.cells.length > 0 &&
            f.cells.every(
              (c) => Array.isArray(c) && c.length === 2 && cell(...c),
            ),
        )
      )
        return false;
      const copy = structuredClone(saved);
      phase = copy.phase;
      players = copy.players;
      frames = copy.frames;
      randMap = copy.randMap;
      newPlayer = p1;
      newPlayer2 = p2;
      enemies = foes;
      bombs = copy.bombs;
      flames = copy.flames;
      winner = 0;
      return true;
    } catch {
      return false;
    }
  }
  return {
    step,
    render,
    snapshot,
    restore,
    get phase() {
      return phase;
    },
    get players() {
      return players;
    },
    get score() {
      return newPlayer.enemiesKilled;
    },
  };
}
