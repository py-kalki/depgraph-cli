'use strict';
/**
 * Jest mock for chalk — identity passthrough (no ANSI codes emitted).
 *
 * Must handle:
 *   chalk.red('text')              → 'text'
 *   chalk.bold.red('text')         → 'text'
 *   chalk.hex('#fff')('text')      → 'text'    (curried)
 *   chalk.hex('#fff').bold('text') → 'text'    (curried + chained)
 *   chalk.bold.hex('#fff')('text') → 'text'
 *
 * The trick: EVERY property access and every function call on a chalk instance
 * returns a new chalk instance (which is itself callable and chainable).
 * Only when the outermost call receives a non-chalk argument do we stringify it.
 */

function makeChalk() {
  function chalkFn(...args) {
    // If called with a string/number/etc, return it as a string
    if (args.length > 0 && typeof args[0] !== 'function') {
      return String(args[0] ?? '');
    }
    // If called with no args or a function, return identity chalk
    return makeChalk();
  }

  const proxy = new Proxy(chalkFn, {
    get(_target, prop) {
      // Prevent accidental Promise wrapping
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined;
      }
      // All property accesses (bold, red, hex, bgRed, etc.) return a new chalk instance
      return makeChalk();
    },
    apply(_target, _this, args) {
      if (args.length === 0) return '';
      const first = args[0];
      if (typeof first === 'string' || typeof first === 'number') {
        return String(first);
      }
      // Called with something else — return identity chalk
      return makeChalk();
    },
  });

  return proxy;
}

const chalk = makeChalk();

Object.defineProperty(chalk, 'level', { value: 0, writable: true });
Object.defineProperty(chalk, 'supportsColor', { value: false, writable: true });

module.exports = chalk;
module.exports.default = chalk;
