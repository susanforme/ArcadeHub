import 'fake-indexeddb/auto';
import { expect, test } from '@rstest/core';
import { listSaves, writeSave } from '../src/shared/storage';

test('stores progress and keeps the highest score across concurrent saves and new runs', async () => {
  await Promise.all([
    writeSave('snake', 100, { marker: 'first' }),
    writeSave('snake', 50, { marker: 'second' }),
  ]);
  let save = (await listSaves()).find((entry) => entry.id === 'snake');
  expect(save?.bestScore).toBe(100);
  expect(save?.score).toBe(50);
  expect(save?.snapshot).toEqual({ marker: 'second' });
  await writeSave('snake', 10, null);
  save = (await listSaves()).find((entry) => entry.id === 'snake');
  expect(save?.bestScore).toBe(100);
  expect(save?.snapshot).toBeNull();
  await writeSave('tetris', 800, { lines: 4 });
  expect(await listSaves()).toHaveLength(2);
});
