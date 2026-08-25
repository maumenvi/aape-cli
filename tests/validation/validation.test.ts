import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  string, number, boolean, literal, array, object, pass,
  ValidationError, ValidationInputError,
} from '../../src/index.ts';

describe('validation', () => {
  // ────────────────────────────────────────────────
  // string
  // ────────────────────────────────────────────────
  describe('string()', () => {
    it('accepts a string', () => {
      assert.equal(string().parse('hello'), 'hello');
    });

    it('rejects a number', () => {
      assert.throws(() => string().parse(42), ValidationInputError);
    });

    it('rejects null', () => {
      assert.throws(() => string().parse(null), ValidationInputError);
    });

    it('.optional() accepts undefined', () => {
      assert.equal(string().optional().parse(undefined), undefined);
    });

    it('.optional() still validates present values', () => {
      assert.throws(() => string().optional().parse(123), ValidationInputError);
    });

    it('.default() uses fallback when undefined', () => {
      assert.equal(string().default('hi').parse(undefined), 'hi');
    });

    it('.default() uses provided value when present', () => {
      assert.equal(string().default('hi').parse('yo'), 'yo');
    });
  });

  // ────────────────────────────────────────────────
  // number
  // ────────────────────────────────────────────────
  describe('number()', () => {
    it('accepts a number', () => {
      assert.equal(number().parse(42), 42);
    });

    it('rejects a string', () => {
      assert.throws(() => number().parse('42'), ValidationInputError);
    });

    it('rejects NaN', () => {
      assert.throws(() => number().parse(NaN), ValidationInputError);
    });

    it('rejects Infinity', () => {
      assert.throws(() => number().parse(Infinity), ValidationInputError);
    });

    it('.default() works', () => {
      assert.equal(number().default(0).parse(undefined), 0);
    });
  });

  // ────────────────────────────────────────────────
  // boolean
  // ────────────────────────────────────────────────
  describe('boolean()', () => {
    it('accepts true', () => assert.equal(boolean().parse(true), true));
    it('accepts false', () => assert.equal(boolean().parse(false), false));

    it('rejects a string', () => {
      assert.throws(() => boolean().parse('true'), ValidationInputError);
    });

    it('.default() works', () => {
      assert.equal(boolean().default(false).parse(undefined), false);
    });
  });

  // ────────────────────────────────────────────────
  // literal
  // ────────────────────────────────────────────────
  describe('literal()', () => {
    it('accepts the exact value', () => {
      assert.equal(literal('admin').parse('admin'), 'admin');
    });

    it('rejects a different value', () => {
      assert.throws(() => literal('admin').parse('user'), ValidationInputError);
    });

    it('works with numbers', () => {
      assert.equal(literal(1).parse(1), 1);
    });

    it('works with null', () => {
      assert.equal(literal(null).parse(null), null);
    });
  });

  // ────────────────────────────────────────────────
  // array
  // ────────────────────────────────────────────────
  describe('array()', () => {
    it('parses an array of strings', () => {
      assert.deepEqual(array(string()).parse(['a', 'b']), ['a', 'b']);
    });

    it('rejects non-array', () => {
      assert.throws(() => array(string()).parse('nope'), ValidationInputError);
    });

    it('collects issues from invalid items', () => {
      const result = array(number()).safeParse([1, 'two', 3]);
      assert.equal(result.success, false);
      if (!result.success) {
        assert(result.error.issues.length > 0);
      }
    });

    it('accepts an empty array', () => {
      assert.deepEqual(array(number()).parse([]), []);
    });
  });

  // ────────────────────────────────────────────────
  // object
  // ────────────────────────────────────────────────
  describe('object()', () => {
    it('parses a valid object', () => {
      const schema = object({ name: string(), age: number() });
      assert.deepEqual(schema.parse({ name: 'Ana', age: 30 }), { name: 'Ana', age: 30 });
    });

    it('rejects a non-object', () => {
      assert.throws(() => object({ x: string() }).parse('nope'), ValidationInputError);
    });

    it('collects all field errors at once', () => {
      const schema = object({ a: number(), b: number() });
      const result = schema.safeParse({ a: 'x', b: 'y' });
      assert.equal(result.success, false);
      if (!result.success) assert(result.error.issues.length >= 2);
    });

    it('optional fields resolve to undefined when absent', () => {
      const schema = object({ name: string(), nick: string().optional() });
      const result = schema.parse({ name: 'Ana' });
      assert.deepEqual(result, { name: 'Ana', nick: undefined });
    });

    it('uses default values for missing fields', () => {
      const schema = object({ name: string(), age: number().default(18) });
      assert.deepEqual(schema.parse({ name: 'Ana' }), { name: 'Ana', age: 18 });
    });
  });

  // ────────────────────────────────────────────────
  // pass
  // ────────────────────────────────────────────────
  describe('pass()', () => {
    it('accepts any value without validation', () => {
      assert.equal(pass().parse('anything'), 'anything');
      assert.equal(pass().parse(42), 42);
      assert.equal(pass().parse(null), null);
    });

    it('works inside object', () => {
      const schema = object({ meta: pass<any>().default('raw') });
      assert.deepEqual(schema.parse({ meta: 123 }), { meta: 123 });
    });

    it('uses default when value is undefined', () => {
      assert.equal(pass<string>().default('fallback').parse(undefined), 'fallback');
    });
  });

  // ────────────────────────────────────────────────
  // error types
  // ────────────────────────────────────────────────
  describe('error types', () => {
    it('parse() throws ValidationInputError', () => {
      assert.throws(() => string().parse(1), ValidationInputError);
    });

    it('safeParse() returns ValidationError on failure', () => {
      const result = string().safeParse(1);
      assert.equal(result.success, false);
      if (!result.success) assert(result.error instanceof ValidationError);
    });

    it('ValidationInputError carries issues array', () => {
      try {
        string().parse(1);
        assert.fail('should have thrown');
      } catch (e) {
        assert(e instanceof ValidationInputError);
        assert(Array.isArray(e.issues));
        assert(e.issues.length > 0);
      }
    });
  });
});
