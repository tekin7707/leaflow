import { describe, it, expect } from 'vitest';
import { detectCycle, validateDepsWithinGroup } from './deps.js';
import { HttpError } from '../errors.js';

describe('detectCycle', () => {
  it('accepts a linear chain', () => {
    const tasks = [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['b'] },
    ];
    const r = detectCycle(tasks);
    expect(r.ok).toBe(true);
    expect(r.order).toEqual(['a', 'b', 'c']);
  });

  it('rejects a direct cycle', () => {
    const tasks = [
      { id: 'a', dependsOn: ['b'] },
      { id: 'b', dependsOn: ['a'] },
    ];
    expect(() => detectCycle(tasks)).toThrow(HttpError);
  });

  it('rejects a 3-node cycle', () => {
    const tasks = [
      { id: 'a', dependsOn: ['c'] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['b'] },
    ];
    expect(() => detectCycle(tasks)).toThrow(HttpError);
  });

  it('accepts diamond DAG', () => {
    const tasks = [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['a'] },
      { id: 'd', dependsOn: ['b', 'c'] },
    ];
    expect(detectCycle(tasks).ok).toBe(true);
  });
});

describe('validateDepsWithinGroup', () => {
  it('rejects external dep references', () => {
    const tasks = [{ id: 'a', dependsOn: ['ghost'] }];
    expect(() => validateDepsWithinGroup(tasks)).toThrow(HttpError);
  });

  it('accepts valid sibling deps', () => {
    const tasks = [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
    ];
    expect(() => validateDepsWithinGroup(tasks)).not.toThrow();
  });
});
