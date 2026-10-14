import { HEIGHT, type Level, type Point, WIDTH } from './levels';

export interface MatterAPI {
  Bodies: typeof MatterJS.Bodies;
  Body: typeof MatterJS.Body;
  Composite: typeof MatterJS.Composite;
  Constraint: typeof MatterJS.Constraint;
  Engine: {
    create(
      options?: MatterJS.IEngineDefinition,
    ): MatterJS.Engine & { world: MatterJS.World & MatterJS.CompositeType };
    update: typeof MatterJS.Engine.update;
    clear: typeof MatterJS.Engine.clear;
  };
  Query: {
    collides(body: MatterJS.BodyType, bodies: MatterJS.BodyType[]): unknown[];
  };
}
const STEP = 1000 / 120;
export const CANDY_RADIUS = 20;
export interface Rope {
  anchor: Point;
  links: MatterJS.BodyType[];
  constraints: MatterJS.ConstraintType[];
  cut: boolean;
}
export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function segmentsTouch(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  tolerance = 8,
) {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  if (
    cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0
  )
    return true;
  return (
    Math.min(
      distanceToSegment(a, c, d),
      distanceToSegment(b, c, d),
      distanceToSegment(c, a, b),
      distanceToSegment(d, a, b),
    ) <= tolerance
  );
}
export class RopeWorld {
  readonly engine: ReturnType<MatterAPI['Engine']['create']>;
  readonly candy: MatterJS.BodyType;
  readonly ropes: Rope[] = [];
  readonly collected = [false, false, false];
  readonly usedBubbles = new Set<number>();
  readonly hazards: MatterJS.BodyType[] = [];
  readonly airTimers: number[];
  bubble = false;
  phase: 'playing' | 'won' | 'lost' = 'playing';
  reason: 'spikes' | 'out' = 'out';
  elapsed = 0;
  private accumulator = 0;
  constructor(
    readonly level: Level,
    private readonly matter: MatterAPI,
  ) {
    const { Bodies, Body, Composite, Constraint, Engine } = matter;
    this.engine = Engine.create({
      constraintIterations: 12,
      positionIterations: 8,
      velocityIterations: 8,
    });
    this.engine.world.gravity.y = 1;
    this.engine.world.gravity.scale = 0.001;
    this.candy = Bodies.circle(level.candy.x, level.candy.y, CANDY_RADIUS, {
      frictionAir: 0.0015,
      restitution: 0.1,
      collisionFilter: { category: 1, mask: 2, group: 0 },
    });
    Body.setMass(this.candy, 1);
    Composite.add(this.engine.world, this.candy);
    for (const anchor of level.anchors) {
      const length = Math.hypot(
        anchor.x - level.candy.x,
        anchor.y - level.candy.y,
      );
      const count = Math.max(4, Math.ceil(length / 24));
      const rope: Rope = { anchor, links: [], constraints: [], cut: false };
      let previous: MatterJS.BodyType | undefined;
      for (let i = 1; i <= count; i++) {
        const last = i === count;
        const link = last
          ? this.candy
          : Bodies.circle(
              anchor.x + ((level.candy.x - anchor.x) * i) / count,
              anchor.y + ((level.candy.y - anchor.y) * i) / count,
              2,
              {
                frictionAir: 0.002,
                collisionFilter: { mask: 0, category: 4, group: 0 },
              },
            );
        if (!last) {
          Body.setMass(link, 0.025);
          rope.links.push(link);
        }
        rope.constraints.push(
          Constraint.create({
            bodyA: previous,
            pointA: previous ? { x: 0, y: 0 } : anchor,
            bodyB: link,
            length: length / count,
            stiffness: 1,
            damping: 0.01,
          }),
        );
        previous = link;
      }
      for (const object of [...rope.links, ...rope.constraints])
        Composite.add(this.engine.world, object);
      this.ropes.push(rope);
    }
    for (const spike of level.spikes ?? []) {
      const count = Math.ceil(spike.width / 24);
      for (let i = 0; i < count; i++) {
        const x = spike.x - spike.width / 2 + ((i + 0.5) * spike.width) / count;
        const body = Bodies.fromVertices(
          x,
          spike.y - 8,
          [
            [
              { x: x - 12, y: spike.y + 10 },
              { x, y: spike.y - 24 },
              { x: x + 12, y: spike.y + 10 },
            ],
          ],
          {
            isStatic: true,
            isSensor: true,
            collisionFilter: { category: 2, mask: 1, group: 0 },
          },
        );
        this.hazards.push(body);
      }
    }
    for (const hazard of this.hazards) Composite.add(this.engine.world, hazard);
    this.airTimers = (level.air ?? []).map(() => 0);
  }
  ropePoints(rope: Rope): Point[] {
    return [
      rope.anchor,
      ...rope.links.map((b) => b.position),
      this.candy.position,
    ];
  }
  cutRope(index: number) {
    const { Composite } = this.matter;
    const rope = this.ropes[index];
    if (!rope || rope.cut || this.phase !== 'playing') return false;
    rope.cut = true;
    // Removing constraints preserves the candy's current velocity and momentum.
    for (const constraint of rope.constraints)
      Composite.remove(this.engine.world, constraint);
    for (const link of rope.links) Composite.remove(this.engine.world, link);
    return true;
  }
  swipe(a: Point, b: Point) {
    const cuts: number[] = [];
    this.ropes.forEach((rope, index) => {
      if (rope.cut) return;
      const points = this.ropePoints(rope);
      if (
        points
          .slice(1)
          .some((point, i) => segmentsTouch(a, b, points[i], point)) &&
        this.cutRope(index)
      )
        cuts.push(index);
    });
    return cuts;
  }
  popBubble() {
    if (!this.bubble || this.phase !== 'playing') return false;
    this.bubble = false;
    this.candy.frictionAir = 0.0015;
    return true;
  }
  blow(index: number) {
    if (
      this.phase !== 'playing' ||
      this.airTimers[index] === undefined ||
      this.airTimers[index] > 0
    )
      return false;
    this.airTimers[index] = 0.18;
    return true;
  }
  step(delta: number) {
    const { Body, Engine, Query } = this.matter;
    if (this.phase !== 'playing') return;
    this.accumulator += Math.max(0, Math.min(delta, 100));
    while (this.accumulator + 1e-7 >= STEP && this.phase === 'playing') {
      this.accumulator -= STEP;
      this.elapsed += STEP / 1000;
      const previous = { ...this.candy.position };
      if (this.bubble)
        Body.applyForce(this.candy, this.candy.position, {
          x: 0,
          y: -this.candy.mass * 0.0017,
        });
      (this.level.air ?? []).forEach((air, index) => {
        if (this.airTimers[index] <= 0) return;
        this.airTimers[index] = Math.max(
          0,
          this.airTimers[index] - STEP / 1000,
        );
        const dx = (this.candy.position.x - air.x) * air.direction;
        if (dx > 0 && dx < 340 && Math.abs(this.candy.position.y - air.y) < 100)
          Body.applyForce(this.candy, this.candy.position, {
            x: air.direction * this.candy.mass * 0.0012,
            y: 0,
          });
      });
      Engine.update(this.engine, STEP);
      const pos = this.candy.position;
      this.level.stars.forEach((star, i) => {
        if (distanceToSegment(star, previous, pos) <= CANDY_RADIUS + 15)
          this.collected[i] = true;
      });
      (this.level.bubbles ?? []).forEach((bubble, i) => {
        if (
          !this.bubble &&
          !this.usedBubbles.has(i) &&
          distanceToSegment(bubble, previous, pos) < 44
        ) {
          this.usedBubbles.add(i);
          this.bubble = true;
          this.candy.frictionAir = 0.035;
          Body.setVelocity(this.candy, {
            x: this.candy.velocity.x * 0.4,
            y: this.candy.velocity.y * 0.2,
          });
        }
      });
      if (Query.collides(this.candy, this.hazards).length) {
        this.phase = 'lost';
        this.reason = 'spikes';
      } else if (distanceToSegment(this.level.monster, previous, pos) < 35)
        this.phase = 'won';
      else if (
        pos.x < -45 ||
        pos.x > WIDTH + 45 ||
        pos.y < 85 ||
        pos.y > HEIGHT - 60
      ) {
        this.phase = 'lost';
        this.reason = 'out';
      }
    }
  }
  destroy() {
    const { Composite, Engine } = this.matter;
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
export interface Progress {
  version: 1;
  level: number;
  best: number[];
  unlocked: number;
}
export function readProgress(value: unknown, count: number): Progress {
  const fallback: Progress = {
    version: 1,
    level: 0,
    best: Array(count).fill(-1),
    unlocked: 0,
  };
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Partial<Progress>;
  if (
    v.version !== 1 ||
    !Number.isInteger(v.level) ||
    !Number.isInteger(v.unlocked) ||
    !Array.isArray(v.best) ||
    v.best.length !== count ||
    v.best.some((n) => !Number.isInteger(n) || n < -1 || n > 3) ||
    (v.level ?? -1) < 0 ||
    (v.level ?? count) >= count ||
    (v.unlocked ?? -1) < 0 ||
    (v.unlocked ?? count) >= count ||
    (v.level ?? count) > (v.unlocked ?? -1)
  )
    return fallback;
  return {
    version: 1,
    level: v.level as number,
    unlocked: v.unlocked as number,
    best: [...v.best],
  };
}
export function recordWin(progress: Progress, stars: number) {
  progress.best[progress.level] = Math.max(
    progress.best[progress.level],
    stars,
  );
  progress.unlocked = Math.max(
    progress.unlocked,
    Math.min(progress.best.length - 1, progress.level + 1),
  );
}
export const totalScore = (p: Progress) =>
  p.best.reduce((sum, n) => sum + (n < 0 ? 0 : 100 + n * 100), 0);
