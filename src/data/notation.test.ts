import { describe, expect, it } from 'vitest';
import { NOTATION_ENTRIES, searchNotationEntries } from './notation';

describe('Calc Type Board notation catalog', () => {
  it('covers every required group with 31 focused cards', () => {
    expect(NOTATION_ENTRIES).toHaveLength(31);
    expect(new Set(NOTATION_ENTRIES.map((entry) => entry.id)).size).toBe(31);
    expect(NOTATION_ENTRIES.filter((entry) => entry.category === 'operators')).toHaveLength(6);
    expect(NOTATION_ENTRIES.filter((entry) => entry.category === 'change')).toHaveLength(4);
    expect(NOTATION_ENTRIES.filter((entry) => entry.category === 'relations')).toHaveLength(8);
    expect(NOTATION_ENTRIES.filter((entry) => entry.category === 'structure')).toHaveLength(5);
    expect(NOTATION_ENTRIES.filter((entry) => entry.category === 'greek')).toHaveLength(8);
  });

  it('requires a real pronunciation and misconception on every card', () => {
    for (const entry of NOTATION_ENTRIES) {
      for (const field of [entry.symbol, entry.name, entry.say, entry.means, entry.example, entry.confusion]) {
        expect(field.trim(), `${entry.id} has a blank required field`).not.toBe('');
      }
      expect(entry.say.length, `${entry.id} pronunciation is too vague`).toBeGreaterThan(4);
      expect(entry.confusion.length, `${entry.id} misconception is too vague`).toBeGreaterThan(45);
    }
  });

  it('keeps five representative misconceptions substantive', () => {
    const sample = ['integral', 'limit', 'dx', 'absolute-value', 'inverse-function'];
    for (const id of sample) {
      const entry = NOTATION_ENTRIES.find((candidate) => candidate.id === id);
      expect(entry?.say).toBeTruthy();
      expect(entry?.confusion).toMatch(/not|does not|is not/i);
    }
    expect(NOTATION_ENTRIES.find((entry) => entry.id === 'dx')?.confusion).toContain('not decoration');
    expect(NOTATION_ENTRIES.find((entry) => entry.id === 'limit')?.confusion).toContain('plug in');
    expect(NOTATION_ENTRIES.find((entry) => entry.id === 'inverse-function')?.confusion).toContain('not 1/f');
  });

  it('searches symbols, formal names, pronunciations, and plain-language descriptions', () => {
    expect(searchNotationEntries('∫').map((entry) => entry.id)).toContain('integral');
    expect(searchNotationEntries('Σ').map((entry) => entry.id)).toContain('sigma');
    expect(searchNotationEntries('integral sign').map((entry) => entry.id)).toContain('integral');
    expect(searchNotationEntries('dee ex').map((entry) => entry.id)).toContain('dx');
    expect(searchNotationEntries('stretched s').map((entry) => entry.id)).toContain('integral');
    expect(searchNotationEntries('definitely-not-a-symbol')).toEqual([]);
  });

  it('category filters never leak cards from another group', () => {
    expect(searchNotationEntries('', 'relations')).toHaveLength(8);
    expect(searchNotationEntries('', 'relations').every((entry) => entry.category === 'relations')).toBe(true);
    expect(searchNotationEntries('delta', 'greek').map((entry) => entry.id)).toEqual([
      'greek-delta',
      'greek-capital-delta',
    ]);
  });

  it('why links point to existing lessons or the planned epsilon-delta route', () => {
    const routes = new Set(['riemann-sum', 'limits', 'derivative', 'unit-circle', 'epsilon-delta']);
    for (const entry of NOTATION_ENTRIES) {
      if (entry.whyLink) expect(routes.has(entry.whyLink), entry.id).toBe(true);
    }
  });
});
