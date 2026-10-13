import { expect, test } from '@rstest/core';
import { events } from '../src/core/event-bus';

test('scene restart can replace a subscription without dispatching to the new scene', () => {
  let calls = 0;
  let removeNew = () => {};
  const remove = events.on('restart', () => {
    calls++;
    remove();
    removeNew = events.on('restart', () => {
      calls++;
    });
  });
  events.emit('restart', undefined);
  expect(calls).toBe(1);
  events.emit('restart', undefined);
  expect(calls).toBe(2);
  removeNew();
});
