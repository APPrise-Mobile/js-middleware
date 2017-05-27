(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jsMiddleware = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.compose = compose;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var middlewareManagerHash = [];

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
function compose() {
  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  funcs = funcs.filter(function (func) {
    return typeof func === 'function';
  });

  if (funcs.length === 1) {
    return funcs[0];
  }

  var last = funcs[funcs.length - 1];
  var rest = funcs.slice(0, -1);
  return function () {
    return rest.reduceRight(function (composed, f) {
      return f(composed);
    }, last.apply(undefined, arguments));
  };
}

/**
 * Manage middlewares for an object.
 * Middleware functions are functions that have access to the target function and it's arguments,
 * and the target object and the next middleware function in the target function cycle.
 * The next middleware function is commonly denoted by a variable named next.
 *
 * Middleware functions can perform the following tasks:
 *  - Execute any code.
 *  - Make changes to the function's arguments.
 *  - End the target function.
 *  - Call the next middleware in the stack.
 *
 * If the current middleware function does not end the target function cycle,
 * it must call next() to pass control to the next middleware function. Otherwise,
 * the target function will be left hanging.
 *
 * e.g.
 *  ```
 *  const walk = target => next => (...args) => {
 *     this.log(`walk function start.`);
 *     const result = next(...args);
 *     this.log(`walk function end.`);
 *     return result;
 *   }
 *  ```
 *
 * Middleware object is an object that contains function's name as same as the target object's function name.
 *
 * e.g.
 *  ```
 *  const Logger = {
 *      walk: target => next => (...args) => {
 *        console.log(`walk function start.`);
 *        const result = next(...args);
 *        console.log(`walk function end.`);
 *        return result;
 *      }
 *   }
 *  ```
 *
 * Function's name start or end with "_" will not be able to apply middleware.
 *
 * @example
 *
 * ## Basic
 *
 * We define a Person class.
 * // the target object
 * class Person {
 *   // the target function
 *   walk(step) {
 *     this.step = step;
 *   }
 *
 *   speak(word) {
 *     this.word = word;
 *   }
 * }
 *
 * Then we define a middleware function to print log.
 *
 * // middleware for walk function
 * const logger = target => next => (...args) => {
 *   console.log(`walk start, steps: ${args[0]}.`);
 *   const result = next(...args);
 *   console.log(`walk end.`);
 *   return result;
 * }
 *
 * Now we apply the log function as a middleware to a Person instance.
 *
 * // apply middleware to target object
 * const p = new Person();
 * const middlewareManager = new MiddlewareManager(p);
 * middlewareManager.use('walk', walk);
 * p.walk(3);
 *
 * Whenever a Person instance call it's walk method, we'll see logs from the looger middleware.
 *
 * ## Middleware object
 * We can also apply a middleware object to a target object.
 * Middleware object is an object that contains function's name as same as the target object's function name.
 *
 * const PersonMiddleware = {
 *   walk: target => next => step => {
 *     console.log(`walk start, steps: step.`);
 *     const result = next(step);
 *     console.log(`walk end.`);
 *     return result;
 *   },
 *   speak: target => next => word => {
 *     word = 'this is a middleware trying to say: ' + word;
 *     return next(word);
 *   }
 * }
 *
 * // apply middleware to target object
 * const p = new Person();
 * const middlewareManager = new MiddlewareManager(p);
 * middlewareManager.use(PersonMiddleware);
 * p.walk(3);
 * p.speak('hi');
 *
 * ## middlewareMethods
 * In a class, function's name start or end with "_" will not be able to apply as middleware.
 * Or we can use `middlewareMethods` to define function names for middleware target within a class.
 *
 * class PersonMiddleware {
 *   constructor() {
 *     // Or Define function names for middleware target.
 *     this.middlewareMethods = ['walk', 'speak'];
 *   }
 *   // Function's name start or end with "_" will not be able to apply as middleware.
 *   _getPrefix() {
 *     return 'Middleware log: ';
 *   }
 *   log(text) {
 *     console.log(this._getPrefix() + text);
 *   }
 *   walk(target) {
 *     return next => step => {
 *       this.log(`walk start, steps: step.`);
 *       const result = next(step);
 *       this.log(`walk end.`);
 *       return result;
 *     }
 *   }
 *   speak(target) {
 *     return next => word => {
 *       this.log('this is a middleware trying to say: ' + word);
 *       return next(word);
 *     }
 *   }
 * }
 *
 * // apply middleware to target object
 * const p = new Person();
 * const middlewareManager = new MiddlewareManager(p);
 * middlewareManager.use(new PersonMiddleware())
 * p.walk(3);
 * p.speak('hi');
 *
 */

var MiddlewareManager = exports.MiddlewareManager = function () {
  /**
   * @param {object} target The target object.
   * @param {...object} middlewareObjects Middleware objects.
   * @return {object} this
   */
  function MiddlewareManager(target) {
    var _instance;

    _classCallCheck(this, MiddlewareManager);

    var instance = middlewareManagerHash.find(function (key) {
      return key._target === target;
    });
    // a target can only has one MiddlewareManager instance
    if (instance === undefined) {
      this._target = target;
      this._methods = {};
      this._methodMiddlewares = {};
      middlewareManagerHash.push(this);
      instance = this;
    }

    for (var _len2 = arguments.length, middlewareObjects = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      middlewareObjects[_key2 - 1] = arguments[_key2];
    }

    (_instance = instance).use.apply(_instance, middlewareObjects);

    return instance;
  }

  // Function's name start or end with "_" will not be able to apply middleware.


  _createClass(MiddlewareManager, [{
    key: '_methodIsValid',
    value: function _methodIsValid(methodName) {
      return !/^_+|_+$|constructor/g.test(methodName);
    }

    // Apply middleware to method

  }, {
    key: '_applyToMethod',
    value: function _applyToMethod(methodName) {
      var _this = this;

      if (typeof methodName === 'string' && this._methodIsValid(methodName)) {
        var method = this._methods[methodName] || this._target[methodName];
        if (typeof method === 'function') {
          this._methods[methodName] = method;
          if (this._methodMiddlewares[methodName] === undefined) {
            this._methodMiddlewares[methodName] = [];
          }

          for (var _len3 = arguments.length, middlewares = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
            middlewares[_key3 - 1] = arguments[_key3];
          }

          middlewares.forEach(function (middleware) {
            return typeof middleware === 'function' && _this._methodMiddlewares[methodName].push(middleware(_this._target));
          });
          this._target[methodName] = compose.apply(undefined, _toConsumableArray(this._methodMiddlewares[methodName]))(method.bind(this._target));
        }
      }
    }

    /**
     * Apply (register) middleware functions to the target function or apply (register) middleware objects.
     * If the first argument is a middleware object, the rest arguments must be middleware objects.
     *
     * @param {string|object} methodName String for target function name, object for a middleware object.
     * @param {...function|...object} middlewares The middleware chain to be applied.
     * @return {object} this
     */

  }, {
    key: 'use',
    value: function use(methodName) {
      var _this2 = this;

      for (var _len4 = arguments.length, middlewares = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        middlewares[_key4 - 1] = arguments[_key4];
      }

      if ((typeof methodName === 'undefined' ? 'undefined' : _typeof(methodName)) === 'object') {
        Array.prototype.slice.call(arguments).forEach(function (arg) {
          // A middleware object can specify target functions within middlewareMethods (Array).
          // e.g. obj.middlewareMethods = ['method1', 'method2'];
          // only method1 and method2 will be the target function.
          (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' && (arg.middlewareMethods || (Object.keys(arg).length ? Object.keys(arg) : Object.getOwnPropertyNames(Object.getPrototypeOf(arg)))).forEach(function (key) {
            typeof arg[key] === 'function' && _this2._methodIsValid(key) && _this2._applyToMethod(key, arg[key].bind(arg));
          });
        });
      } else {
        this._applyToMethod.apply(this, [methodName].concat(middlewares));
      }

      return this;
    }
  }]);

  return MiddlewareManager;
}();

if (typeof window !== 'undefined') {
  window['MiddlewareManager'] = MiddlewareManager;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvTWlkZGxld2FyZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7O1FBYWdCLE8sR0FBQSxPOzs7Ozs7QUFaaEIsSUFBSSx3QkFBd0IsRUFBNUI7O0FBRUE7Ozs7Ozs7Ozs7QUFVTyxTQUFTLE9BQVQsR0FBMkI7QUFBQSxvQ0FBUCxLQUFPO0FBQVAsU0FBTztBQUFBOztBQUNoQyxNQUFJLE1BQU0sTUFBTixLQUFpQixDQUFyQixFQUF3QjtBQUN0QixXQUFPO0FBQUEsYUFBTyxHQUFQO0FBQUEsS0FBUDtBQUNEOztBQUVELFVBQVEsTUFBTSxNQUFOLENBQWE7QUFBQSxXQUFRLE9BQU8sSUFBUCxLQUFnQixVQUF4QjtBQUFBLEdBQWIsQ0FBUjs7QUFFQSxNQUFJLE1BQU0sTUFBTixLQUFpQixDQUFyQixFQUF3QjtBQUN0QixXQUFPLE1BQU0sQ0FBTixDQUFQO0FBQ0Q7O0FBRUQsTUFBTSxPQUFPLE1BQU0sTUFBTSxNQUFOLEdBQWUsQ0FBckIsQ0FBYjtBQUNBLE1BQU0sT0FBTyxNQUFNLEtBQU4sQ0FBWSxDQUFaLEVBQWUsQ0FBQyxDQUFoQixDQUFiO0FBQ0EsU0FBTztBQUFBLFdBQWEsS0FBSyxXQUFMLENBQWlCLFVBQUMsUUFBRCxFQUFXLENBQVg7QUFBQSxhQUFpQixFQUFFLFFBQUYsQ0FBakI7QUFBQSxLQUFqQixFQUErQyxnQ0FBL0MsQ0FBYjtBQUFBLEdBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBK0lhLGlCLFdBQUEsaUI7QUFDWDs7Ozs7QUFLQSw2QkFBWSxNQUFaLEVBQTBDO0FBQUE7O0FBQUE7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LG1CQUFQLElBQThCLGlCQUE5QjtBQUNEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcbmxldCBtaWRkbGV3YXJlTWFuYWdlckhhc2ggPSBbXTtcblxuLyoqXG4gKiBDb21wb3NlcyBzaW5nbGUtYXJndW1lbnQgZnVuY3Rpb25zIGZyb20gcmlnaHQgdG8gbGVmdC4gVGhlIHJpZ2h0bW9zdFxuICogZnVuY3Rpb24gY2FuIHRha2UgbXVsdGlwbGUgYXJndW1lbnRzIGFzIGl0IHByb3ZpZGVzIHRoZSBzaWduYXR1cmUgZm9yXG4gKiB0aGUgcmVzdWx0aW5nIGNvbXBvc2l0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gey4uLkZ1bmN0aW9ufSBmdW5jcyBUaGUgZnVuY3Rpb25zIHRvIGNvbXBvc2UuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgZnVuY3Rpb24gb2J0YWluZWQgYnkgY29tcG9zaW5nIHRoZSBhcmd1bWVudCBmdW5jdGlvbnNcbiAqIGZyb20gcmlnaHQgdG8gbGVmdC4gRm9yIGV4YW1wbGUsIGNvbXBvc2UoZiwgZywgaCkgaXMgaWRlbnRpY2FsIHRvIGRvaW5nXG4gKiAoLi4uYXJncykgPT4gZihnKGgoLi4uYXJncykpKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvc2UoLi4uZnVuY3MpIHtcbiAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBhcmcgPT4gYXJnO1xuICB9XG5cbiAgZnVuY3MgPSBmdW5jcy5maWx0ZXIoZnVuYyA9PiB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyk7XG5cbiAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBmdW5jc1swXTtcbiAgfVxuXG4gIGNvbnN0IGxhc3QgPSBmdW5jc1tmdW5jcy5sZW5ndGggLSAxXTtcbiAgY29uc3QgcmVzdCA9IGZ1bmNzLnNsaWNlKDAsIC0xKTtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiByZXN0LnJlZHVjZVJpZ2h0KChjb21wb3NlZCwgZikgPT4gZihjb21wb3NlZCksIGxhc3QoLi4uYXJncykpO1xufVxuXG4vKipcbiAqIE1hbmFnZSBtaWRkbGV3YXJlcyBmb3IgYW4gb2JqZWN0LlxuICogTWlkZGxld2FyZSBmdW5jdGlvbnMgYXJlIGZ1bmN0aW9ucyB0aGF0IGhhdmUgYWNjZXNzIHRvIHRoZSB0YXJnZXQgZnVuY3Rpb24gYW5kIGl0J3MgYXJndW1lbnRzLFxuICogYW5kIHRoZSB0YXJnZXQgb2JqZWN0IGFuZCB0aGUgbmV4dCBtaWRkbGV3YXJlIGZ1bmN0aW9uIGluIHRoZSB0YXJnZXQgZnVuY3Rpb24gY3ljbGUuXG4gKiBUaGUgbmV4dCBtaWRkbGV3YXJlIGZ1bmN0aW9uIGlzIGNvbW1vbmx5IGRlbm90ZWQgYnkgYSB2YXJpYWJsZSBuYW1lZCBuZXh0LlxuICpcbiAqIE1pZGRsZXdhcmUgZnVuY3Rpb25zIGNhbiBwZXJmb3JtIHRoZSBmb2xsb3dpbmcgdGFza3M6XG4gKiAgLSBFeGVjdXRlIGFueSBjb2RlLlxuICogIC0gTWFrZSBjaGFuZ2VzIHRvIHRoZSBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAqICAtIEVuZCB0aGUgdGFyZ2V0IGZ1bmN0aW9uLlxuICogIC0gQ2FsbCB0aGUgbmV4dCBtaWRkbGV3YXJlIGluIHRoZSBzdGFjay5cbiAqXG4gKiBJZiB0aGUgY3VycmVudCBtaWRkbGV3YXJlIGZ1bmN0aW9uIGRvZXMgbm90IGVuZCB0aGUgdGFyZ2V0IGZ1bmN0aW9uIGN5Y2xlLFxuICogaXQgbXVzdCBjYWxsIG5leHQoKSB0byBwYXNzIGNvbnRyb2wgdG8gdGhlIG5leHQgbWlkZGxld2FyZSBmdW5jdGlvbi4gT3RoZXJ3aXNlLFxuICogdGhlIHRhcmdldCBmdW5jdGlvbiB3aWxsIGJlIGxlZnQgaGFuZ2luZy5cbiAqXG4gKiBlLmcuXG4gKiAgYGBgXG4gKiAgY29uc3Qgd2FsayA9IHRhcmdldCA9PiBuZXh0ID0+ICguLi5hcmdzKSA9PiB7XG4gKiAgICAgdGhpcy5sb2coYHdhbGsgZnVuY3Rpb24gc3RhcnQuYCk7XG4gKiAgICAgY29uc3QgcmVzdWx0ID0gbmV4dCguLi5hcmdzKTtcbiAqICAgICB0aGlzLmxvZyhgd2FsayBmdW5jdGlvbiBlbmQuYCk7XG4gKiAgICAgcmV0dXJuIHJlc3VsdDtcbiAqICAgfVxuICogIGBgYFxuICpcbiAqIE1pZGRsZXdhcmUgb2JqZWN0IGlzIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGZ1bmN0aW9uJ3MgbmFtZSBhcyBzYW1lIGFzIHRoZSB0YXJnZXQgb2JqZWN0J3MgZnVuY3Rpb24gbmFtZS5cbiAqXG4gKiBlLmcuXG4gKiAgYGBgXG4gKiAgY29uc3QgTG9nZ2VyID0ge1xuICogICAgICB3YWxrOiB0YXJnZXQgPT4gbmV4dCA9PiAoLi4uYXJncykgPT4ge1xuICogICAgICAgIGNvbnNvbGUubG9nKGB3YWxrIGZ1bmN0aW9uIHN0YXJ0LmApO1xuICogICAgICAgIGNvbnN0IHJlc3VsdCA9IG5leHQoLi4uYXJncyk7XG4gKiAgICAgICAgY29uc29sZS5sb2coYHdhbGsgZnVuY3Rpb24gZW5kLmApO1xuICogICAgICAgIHJldHVybiByZXN1bHQ7XG4gKiAgICAgIH1cbiAqICAgfVxuICogIGBgYFxuICpcbiAqIEZ1bmN0aW9uJ3MgbmFtZSBzdGFydCBvciBlbmQgd2l0aCBcIl9cIiB3aWxsIG5vdCBiZSBhYmxlIHRvIGFwcGx5IG1pZGRsZXdhcmUuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiAjIyBCYXNpY1xuICpcbiAqIFdlIGRlZmluZSBhIFBlcnNvbiBjbGFzcy5cbiAqIC8vIHRoZSB0YXJnZXQgb2JqZWN0XG4gKiBjbGFzcyBQZXJzb24ge1xuICogICAvLyB0aGUgdGFyZ2V0IGZ1bmN0aW9uXG4gKiAgIHdhbGsoc3RlcCkge1xuICogICAgIHRoaXMuc3RlcCA9IHN0ZXA7XG4gKiAgIH1cbiAqXG4gKiAgIHNwZWFrKHdvcmQpIHtcbiAqICAgICB0aGlzLndvcmQgPSB3b3JkO1xuICogICB9XG4gKiB9XG4gKlxuICogVGhlbiB3ZSBkZWZpbmUgYSBtaWRkbGV3YXJlIGZ1bmN0aW9uIHRvIHByaW50IGxvZy5cbiAqXG4gKiAvLyBtaWRkbGV3YXJlIGZvciB3YWxrIGZ1bmN0aW9uXG4gKiBjb25zdCBsb2dnZXIgPSB0YXJnZXQgPT4gbmV4dCA9PiAoLi4uYXJncykgPT4ge1xuICogICBjb25zb2xlLmxvZyhgd2FsayBzdGFydCwgc3RlcHM6ICR7YXJnc1swXX0uYCk7XG4gKiAgIGNvbnN0IHJlc3VsdCA9IG5leHQoLi4uYXJncyk7XG4gKiAgIGNvbnNvbGUubG9nKGB3YWxrIGVuZC5gKTtcbiAqICAgcmV0dXJuIHJlc3VsdDtcbiAqIH1cbiAqXG4gKiBOb3cgd2UgYXBwbHkgdGhlIGxvZyBmdW5jdGlvbiBhcyBhIG1pZGRsZXdhcmUgdG8gYSBQZXJzb24gaW5zdGFuY2UuXG4gKlxuICogLy8gYXBwbHkgbWlkZGxld2FyZSB0byB0YXJnZXQgb2JqZWN0XG4gKiBjb25zdCBwID0gbmV3IFBlcnNvbigpO1xuICogY29uc3QgbWlkZGxld2FyZU1hbmFnZXIgPSBuZXcgTWlkZGxld2FyZU1hbmFnZXIocCk7XG4gKiBtaWRkbGV3YXJlTWFuYWdlci51c2UoJ3dhbGsnLCB3YWxrKTtcbiAqIHAud2FsaygzKTtcbiAqXG4gKiBXaGVuZXZlciBhIFBlcnNvbiBpbnN0YW5jZSBjYWxsIGl0J3Mgd2FsayBtZXRob2QsIHdlJ2xsIHNlZSBsb2dzIGZyb20gdGhlIGxvb2dlciBtaWRkbGV3YXJlLlxuICpcbiAqICMjIE1pZGRsZXdhcmUgb2JqZWN0XG4gKiBXZSBjYW4gYWxzbyBhcHBseSBhIG1pZGRsZXdhcmUgb2JqZWN0IHRvIGEgdGFyZ2V0IG9iamVjdC5cbiAqIE1pZGRsZXdhcmUgb2JqZWN0IGlzIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGZ1bmN0aW9uJ3MgbmFtZSBhcyBzYW1lIGFzIHRoZSB0YXJnZXQgb2JqZWN0J3MgZnVuY3Rpb24gbmFtZS5cbiAqXG4gKiBjb25zdCBQZXJzb25NaWRkbGV3YXJlID0ge1xuICogICB3YWxrOiB0YXJnZXQgPT4gbmV4dCA9PiBzdGVwID0+IHtcbiAqICAgICBjb25zb2xlLmxvZyhgd2FsayBzdGFydCwgc3RlcHM6IHN0ZXAuYCk7XG4gKiAgICAgY29uc3QgcmVzdWx0ID0gbmV4dChzdGVwKTtcbiAqICAgICBjb25zb2xlLmxvZyhgd2FsayBlbmQuYCk7XG4gKiAgICAgcmV0dXJuIHJlc3VsdDtcbiAqICAgfSxcbiAqICAgc3BlYWs6IHRhcmdldCA9PiBuZXh0ID0+IHdvcmQgPT4ge1xuICogICAgIHdvcmQgPSAndGhpcyBpcyBhIG1pZGRsZXdhcmUgdHJ5aW5nIHRvIHNheTogJyArIHdvcmQ7XG4gKiAgICAgcmV0dXJuIG5leHQod29yZCk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiAvLyBhcHBseSBtaWRkbGV3YXJlIHRvIHRhcmdldCBvYmplY3RcbiAqIGNvbnN0IHAgPSBuZXcgUGVyc29uKCk7XG4gKiBjb25zdCBtaWRkbGV3YXJlTWFuYWdlciA9IG5ldyBNaWRkbGV3YXJlTWFuYWdlcihwKTtcbiAqIG1pZGRsZXdhcmVNYW5hZ2VyLnVzZShQZXJzb25NaWRkbGV3YXJlKTtcbiAqIHAud2FsaygzKTtcbiAqIHAuc3BlYWsoJ2hpJyk7XG4gKlxuICogIyMgbWlkZGxld2FyZU1ldGhvZHNcbiAqIEluIGEgY2xhc3MsIGZ1bmN0aW9uJ3MgbmFtZSBzdGFydCBvciBlbmQgd2l0aCBcIl9cIiB3aWxsIG5vdCBiZSBhYmxlIHRvIGFwcGx5IGFzIG1pZGRsZXdhcmUuXG4gKiBPciB3ZSBjYW4gdXNlIGBtaWRkbGV3YXJlTWV0aG9kc2AgdG8gZGVmaW5lIGZ1bmN0aW9uIG5hbWVzIGZvciBtaWRkbGV3YXJlIHRhcmdldCB3aXRoaW4gYSBjbGFzcy5cbiAqXG4gKiBjbGFzcyBQZXJzb25NaWRkbGV3YXJlIHtcbiAqICAgY29uc3RydWN0b3IoKSB7XG4gKiAgICAgLy8gT3IgRGVmaW5lIGZ1bmN0aW9uIG5hbWVzIGZvciBtaWRkbGV3YXJlIHRhcmdldC5cbiAqICAgICB0aGlzLm1pZGRsZXdhcmVNZXRob2RzID0gWyd3YWxrJywgJ3NwZWFrJ107XG4gKiAgIH1cbiAqICAgLy8gRnVuY3Rpb24ncyBuYW1lIHN0YXJ0IG9yIGVuZCB3aXRoIFwiX1wiIHdpbGwgbm90IGJlIGFibGUgdG8gYXBwbHkgYXMgbWlkZGxld2FyZS5cbiAqICAgX2dldFByZWZpeCgpIHtcbiAqICAgICByZXR1cm4gJ01pZGRsZXdhcmUgbG9nOiAnO1xuICogICB9XG4gKiAgIGxvZyh0ZXh0KSB7XG4gKiAgICAgY29uc29sZS5sb2codGhpcy5fZ2V0UHJlZml4KCkgKyB0ZXh0KTtcbiAqICAgfVxuICogICB3YWxrKHRhcmdldCkge1xuICogICAgIHJldHVybiBuZXh0ID0+IHN0ZXAgPT4ge1xuICogICAgICAgdGhpcy5sb2coYHdhbGsgc3RhcnQsIHN0ZXBzOiBzdGVwLmApO1xuICogICAgICAgY29uc3QgcmVzdWx0ID0gbmV4dChzdGVwKTtcbiAqICAgICAgIHRoaXMubG9nKGB3YWxrIGVuZC5gKTtcbiAqICAgICAgIHJldHVybiByZXN1bHQ7XG4gKiAgICAgfVxuICogICB9XG4gKiAgIHNwZWFrKHRhcmdldCkge1xuICogICAgIHJldHVybiBuZXh0ID0+IHdvcmQgPT4ge1xuICogICAgICAgdGhpcy5sb2coJ3RoaXMgaXMgYSBtaWRkbGV3YXJlIHRyeWluZyB0byBzYXk6ICcgKyB3b3JkKTtcbiAqICAgICAgIHJldHVybiBuZXh0KHdvcmQpO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICpcbiAqIC8vIGFwcGx5IG1pZGRsZXdhcmUgdG8gdGFyZ2V0IG9iamVjdFxuICogY29uc3QgcCA9IG5ldyBQZXJzb24oKTtcbiAqIGNvbnN0IG1pZGRsZXdhcmVNYW5hZ2VyID0gbmV3IE1pZGRsZXdhcmVNYW5hZ2VyKHApO1xuICogbWlkZGxld2FyZU1hbmFnZXIudXNlKG5ldyBQZXJzb25NaWRkbGV3YXJlKCkpXG4gKiBwLndhbGsoMyk7XG4gKiBwLnNwZWFrKCdoaScpO1xuICpcbiAqL1xuZXhwb3J0IGNsYXNzIE1pZGRsZXdhcmVNYW5hZ2VyIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgVGhlIHRhcmdldCBvYmplY3QuXG4gICAqIEBwYXJhbSB7Li4ub2JqZWN0fSBtaWRkbGV3YXJlT2JqZWN0cyBNaWRkbGV3YXJlIG9iamVjdHMuXG4gICAqIEByZXR1cm4ge29iamVjdH0gdGhpc1xuICAgKi9cbiAgY29uc3RydWN0b3IodGFyZ2V0LCAuLi5taWRkbGV3YXJlT2JqZWN0cykge1xuICAgIGxldCBpbnN0YW5jZSA9IG1pZGRsZXdhcmVNYW5hZ2VySGFzaC5maW5kKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIHJldHVybiBrZXkuX3RhcmdldCA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICAgIC8vIGEgdGFyZ2V0IGNhbiBvbmx5IGhhcyBvbmUgTWlkZGxld2FyZU1hbmFnZXIgaW5zdGFuY2VcbiAgICBpZiAoaW5zdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuICAgICAgdGhpcy5fbWV0aG9kcyA9IHt9O1xuICAgICAgdGhpcy5fbWV0aG9kTWlkZGxld2FyZXMgPSB7fTtcbiAgICAgIG1pZGRsZXdhcmVNYW5hZ2VySGFzaC5wdXNoKHRoaXMpO1xuICAgICAgaW5zdGFuY2UgPSB0aGlzO1xuICAgIH1cbiAgICBpbnN0YW5jZS51c2UoLi4ubWlkZGxld2FyZU9iamVjdHMpO1xuXG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgLy8gRnVuY3Rpb24ncyBuYW1lIHN0YXJ0IG9yIGVuZCB3aXRoIFwiX1wiIHdpbGwgbm90IGJlIGFibGUgdG8gYXBwbHkgbWlkZGxld2FyZS5cbiAgX21ldGhvZElzVmFsaWQobWV0aG9kTmFtZSkge1xuICAgIHJldHVybiAhL15fK3xfKyR8Y29uc3RydWN0b3IvZy50ZXN0KG1ldGhvZE5hbWUpO1xuICB9XG5cbiAgLy8gQXBwbHkgbWlkZGxld2FyZSB0byBtZXRob2RcbiAgX2FwcGx5VG9NZXRob2QobWV0aG9kTmFtZSwgLi4ubWlkZGxld2FyZXMpIHtcbiAgICBpZiAodHlwZW9mIG1ldGhvZE5hbWUgPT09ICdzdHJpbmcnICYmIHRoaXMuX21ldGhvZElzVmFsaWQobWV0aG9kTmFtZSkpIHtcbiAgICAgIGxldCBtZXRob2QgPSB0aGlzLl9tZXRob2RzW21ldGhvZE5hbWVdIHx8IHRoaXMuX3RhcmdldFttZXRob2ROYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgbWV0aG9kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX21ldGhvZHNbbWV0aG9kTmFtZV0gPSBtZXRob2Q7XG4gICAgICAgIGlmICh0aGlzLl9tZXRob2RNaWRkbGV3YXJlc1ttZXRob2ROYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fbWV0aG9kTWlkZGxld2FyZXNbbWV0aG9kTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBtaWRkbGV3YXJlcy5mb3JFYWNoKG1pZGRsZXdhcmUgPT5cbiAgICAgICAgICB0eXBlb2YgbWlkZGxld2FyZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0aGlzLl9tZXRob2RNaWRkbGV3YXJlc1ttZXRob2ROYW1lXS5wdXNoKG1pZGRsZXdhcmUodGhpcy5fdGFyZ2V0KSlcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0W21ldGhvZE5hbWVdID0gY29tcG9zZSguLi50aGlzLl9tZXRob2RNaWRkbGV3YXJlc1ttZXRob2ROYW1lXSkobWV0aG9kLmJpbmQodGhpcy5fdGFyZ2V0KSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IChyZWdpc3RlcikgbWlkZGxld2FyZSBmdW5jdGlvbnMgdG8gdGhlIHRhcmdldCBmdW5jdGlvbiBvciBhcHBseSAocmVnaXN0ZXIpIG1pZGRsZXdhcmUgb2JqZWN0cy5cbiAgICogSWYgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIGEgbWlkZGxld2FyZSBvYmplY3QsIHRoZSByZXN0IGFyZ3VtZW50cyBtdXN0IGJlIG1pZGRsZXdhcmUgb2JqZWN0cy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBtZXRob2ROYW1lIFN0cmluZyBmb3IgdGFyZ2V0IGZ1bmN0aW9uIG5hbWUsIG9iamVjdCBmb3IgYSBtaWRkbGV3YXJlIG9iamVjdC5cbiAgICogQHBhcmFtIHsuLi5mdW5jdGlvbnwuLi5vYmplY3R9IG1pZGRsZXdhcmVzIFRoZSBtaWRkbGV3YXJlIGNoYWluIHRvIGJlIGFwcGxpZWQuXG4gICAqIEByZXR1cm4ge29iamVjdH0gdGhpc1xuICAgKi9cbiAgdXNlKG1ldGhvZE5hbWUsIC4uLm1pZGRsZXdhcmVzKSB7XG4gICAgaWYgKHR5cGVvZiBtZXRob2ROYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5mb3JFYWNoKGFyZyA9PiB7XG4gICAgICAgIC8vIEEgbWlkZGxld2FyZSBvYmplY3QgY2FuIHNwZWNpZnkgdGFyZ2V0IGZ1bmN0aW9ucyB3aXRoaW4gbWlkZGxld2FyZU1ldGhvZHMgKEFycmF5KS5cbiAgICAgICAgLy8gZS5nLiBvYmoubWlkZGxld2FyZU1ldGhvZHMgPSBbJ21ldGhvZDEnLCAnbWV0aG9kMiddO1xuICAgICAgICAvLyBvbmx5IG1ldGhvZDEgYW5kIG1ldGhvZDIgd2lsbCBiZSB0aGUgdGFyZ2V0IGZ1bmN0aW9uLlxuICAgICAgICB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAoYXJnLm1pZGRsZXdhcmVNZXRob2RzIHx8XG4gICAgICAgIChPYmplY3Qua2V5cyhhcmcpLmxlbmd0aCA/IE9iamVjdC5rZXlzKGFyZykgOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXJnKSkpXG4gICAgICAgICkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHR5cGVvZiBhcmdba2V5XSA9PT0gJ2Z1bmN0aW9uJyAmJiB0aGlzLl9tZXRob2RJc1ZhbGlkKGtleSkgJiYgdGhpcy5fYXBwbHlUb01ldGhvZChrZXksIGFyZ1trZXldLmJpbmQoYXJnKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FwcGx5VG9NZXRob2QobWV0aG9kTmFtZSwgLi4ubWlkZGxld2FyZXMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3dbJ01pZGRsZXdhcmVNYW5hZ2VyJ10gPSBNaWRkbGV3YXJlTWFuYWdlcjtcbn1cbiJdfQ==
