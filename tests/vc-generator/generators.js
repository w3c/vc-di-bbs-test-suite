/*!
 * Copyright (c) 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as mocks from './mockMethods.js';

export function noProofTypeorCryptosuite({
  suite,
  selectiveSuite,
  ...args}) {
  suite._cryptosuite = _proxyStub({
    object: suite._cryptosuite,
    mocks: {createVerifyData: mocks.createVerifyData},
  });
  return {...args, suite, selectiveSuite};
}

export function invalidStringEncoding({suite, selectiveSuite, ...args}) {
  suite._cryptosuite = _proxyStub({
    object: suite._cryptosuite,
    mocks: {createProofValue: mocks.createProofValue}
  });
  return {...args, suite, selectiveSuite};
}

/**
 * Creates a Proxy around a method on an object.
 *
 * @param {object} options - Options to use.
 * @param {object} options.object - The object to proxy.
 * @param {{[key: string]: Function}} options.mocks - A collection of mock
 *   methods.
 *
 * @returns {Proxy} - Returns a Proxy.
 */
function _proxyStub({object, mocks}) {
  return new Proxy(object, {
    get(target, prop) {
      const mock = mocks[prop];
      if(mock) {
        return mock;
      }
      return Reflect.get(...arguments);
    }
  });
}
