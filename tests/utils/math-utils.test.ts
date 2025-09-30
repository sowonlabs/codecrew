import { describe, it, expect } from 'vitest';
import { add, multiply, subtract } from '../../src/utils/math-utils';

describe('Math Utils', () => {
  describe('add', () => {
    it('should return the sum of two numbers', () => {
      expect(add(1, 2)).toBe(3);
    });
  });

  describe('multiply', () => {
    it('should return the product of two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it('should return the product of 6 and 9', () => {
      expect(multiply(6, 9)).toBe(54);
    });
  });

  describe('subtract', () => {
    it('should return the difference of two numbers', () => {
      expect(subtract(50, 25)).toBe(25);
    });

    it('should return the difference of 100 and 30', () => {
      expect(subtract(100, 30)).toBe(70);
    });
  });
});
