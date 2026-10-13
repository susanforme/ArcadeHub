import type Phaser from 'phaser';

export function renderSize(
  logical: { width: number; height: number },
  parent: { width: number; height: number },
  dpr: number,
) {
  const scale = Math.min(
    parent.width / logical.width,
    parent.height / logical.height,
  );
  return {
    width: Math.max(1, Math.round(logical.width * scale * dpr)),
    height: Math.max(1, Math.round(logical.height * scale * dpr)),
  };
}

export function bindGameDisplay(
  game: Phaser.Game,
  parent: HTMLElement,
  logical: { width: number; height: number },
) {
  const updateScene = (scene: Phaser.Scene) => {
    if (!scene.cameras.main) return;
    const { width, height } = game.scale.gameSize;
    const zoom = Math.max(width / logical.width, height / logical.height);
    scene.cameras.main
      .setViewport(0, 0, width, height)
      .setOrigin(0, 0)
      .setZoom(width / logical.width, height / logical.height);
    for (const child of scene.children.list) {
      if (child.type === 'Text') {
        const text = child as Phaser.GameObjects.Text;
        const resolution = Math.max(1, zoom);
        if (text.style.resolution !== resolution)
          text.setResolution(resolution);
      }
    }
  };
  const resize = () => {
    if (!parent.clientWidth || !parent.clientHeight) return;
    const size = renderSize(
      logical,
      { width: parent.clientWidth, height: parent.clientHeight },
      window.devicePixelRatio || 1,
    );
    game.scale.getParentBounds();
    if (game.scale.width !== size.width || game.scale.height !== size.height) {
      game.scale.setGameSize(size.width, size.height);
    }
    game.scale.refresh();
    for (const scene of game.scene.getScenes(true)) updateScene(scene);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  window.addEventListener('resize', resize);
  let density = window.devicePixelRatio || 1;
  const checkDensity = () => {
    const next = window.devicePixelRatio || 1;
    if (next !== density) {
      density = next;
      resize();
    }
  };
  game.events.on('prestep', checkDensity);
  game.events.once('destroy', () => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
    game.events.off('prestep', checkDensity);
  });
  resize();
  return updateScene;
}
