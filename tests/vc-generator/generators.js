/*!
 * Copyright (c) 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as stubs from './stubMethods.js';
import {Token, Type} from 'cborg';

export function allowUnsafeCanonize({suite, selectiveSuite, ...args}) {
  suite._cryptosuite = stubMethods({
    object: suite._cryptosuite,
    stubs: {createVerifyData: stubs.stubVerifyData({safe: false})},
  });
  return {...args, suite, selectiveSuite};
}

export function invalidStringEncoding({suite, selectiveSuite, ...args}) {
  suite._cryptosuite = stubMethods({
    object: suite._cryptosuite,
    stubs: {createProofValue: stubs.stubProofValue({utfOffset: 1})}
  });
  return {...args, suite, selectiveSuite};
}

export function invalidCborEncoding({suite, selectiveSuite, ...args}) {
  const typeEncoders = {
    Uint8Array(uint8Array) {
      return [
        new Token(Type.tag, 2),
        new Token(Type.bytes, uint8Array.map(b => b + 1))
      ];
    }
  };
  suite._cryptosuite = stubMethods({
    object: suite._cryptosuite,
    stubs: {createProofValue: stubs.stubProofValue({typeEncoders})}
  });
  selectiveSuite._cryptosuite = stubMethods({
    object: selectiveSuite._cryptosuite,
    stubs: {derive: stubs.stubDerive({typeEncoders})}
  });
  return {...args, suite, selectiveSuite};
}

/**
 * Creates a Proxy which stubs method(s) on an object.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 *
 * @param {object} options - Options to use.
 * @param {object} options.object - The object to proxy.
 * @param {{[key: string]: Function}} options.stubs - A collection of stub
 *   methods.
 *
 * @returns {Proxy} - Returns a Proxy.
 */
function stubMethods({object, stubs}) {
  return new Proxy(object, {
    // proxy intercepts the Object.prototype.get method
    get(target, prop) {
      // if the intended property on the object is in the stubs
      const stub = stubs[prop];
      // return the stub method
      if(stub) {
        return stub;
      }
      // if no stub return the original object's method
      return Reflect.get(...arguments);
    }
  });
}
