import microban from './collections/microban-ii.txt?raw';
import sasquatch from './collections/sasquatch.txt?raw';

export interface Level {
  id: string;
  collection: string;
  number: number;
  title: string;
  rows: string[];
  width: number;
  height: number;
  floor: number[];
  goals: number[];
  player: number;
  boxes: number[];
}

// XSB: spaces outside the enclosing walls are void, not walkable floor.
export function parseLevel(
  rows: string[],
  metadata = {
    id: 'test',
    collection: 'Test',
    number: 1,
    title: '',
  },
): Level {
  const width = Math.max(...rows.map((row) => row.length));
  const cells = rows.flatMap((row) => [...row.padEnd(width, ' ')]);
  if (!rows.length || cells.some((cell) => !'# .$@*+'.includes(cell)))
    throw new Error('Invalid Sokoban tile');
  const outside = new Set<number>();
  const queue: number[] = [];
  for (let index = 0; index < cells.length; index++) {
    if (
      index < width ||
      index >= cells.length - width ||
      index % width === 0 ||
      index % width === width - 1
    )
      if (cells[index] !== '#') {
        outside.add(index);
        queue.push(index);
      }
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    for (const next of [
      index - width,
      index + width,
      ...(index % width ? [index - 1] : []),
      ...(index % width < width - 1 ? [index + 1] : []),
    ]) {
      if (
        next < 0 ||
        next >= cells.length ||
        cells[next] === '#' ||
        outside.has(next)
      )
        continue;
      outside.add(next);
      queue.push(next);
    }
  }
  for (const index of outside) {
    if (cells[index] !== ' ') throw new Error('Sokoban map must be enclosed');
    cells[index] = '_';
  }
  const level: Level = {
    ...metadata,
    rows: Array.from({ length: rows.length }, (_, y) =>
      cells.slice(y * width, (y + 1) * width).join(''),
    ),
    width,
    height: rows.length,
    floor: [],
    goals: [],
    player: -1,
    boxes: [],
  };
  let players = 0;
  cells.forEach((cell, index) => {
    if (cell === '#' || cell === '_') return;
    level.floor.push(index);
    if ('.*+'.includes(cell)) level.goals.push(index);
    if ('$*'.includes(cell)) level.boxes.push(index);
    if ('@+'.includes(cell)) {
      level.player = index;
      players++;
    }
  });
  if (
    players !== 1 ||
    !level.boxes.length ||
    level.boxes.length !== level.goals.length
  )
    throw new Error('Sokoban map needs one player and matching crates/goals');
  return level;
}

export function parseCollection(text: string, id: string, name: string) {
  const maps: Level[] = [];
  let rows: string[] = [];
  let number = 0;
  let title = '';
  const finish = () => {
    if (!number) return;
    maps.push(
      parseLevel(rows, {
        id: `${id}-${number}`,
        collection: name,
        number,
        title,
      }),
    );
    rows = [];
  };
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const header = line.match(/^;\s*(\d+)(?:\s+'(.*)')?\s*$/);
    if (header) {
      finish();
      number = Number(header[1]);
      title = header[2] ?? '';
      if (number !== maps.length + 1)
        throw new Error('Invalid Sokoban level order');
    } else if (line.includes('#')) rows.push(line);
    else if (line.trim()) throw new Error('Invalid Sokoban collection');
  }
  finish();
  return maps;
}

export const collections = [
  {
    id: 'microban-ii',
    name: 'Microban II',
    levels: parseCollection(microban, 'microban-ii', 'Microban II'),
  },
  {
    id: 'sasquatch',
    name: 'Sasquatch',
    levels: parseCollection(sasquatch, 'sasquatch', 'Sasquatch'),
  },
];
export const levels = collections.flatMap((collection) => collection.levels);
