/*!
 * Copyright (c) 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as mocks from './mockMethods.js';

export function noProofTypeorCryptosuite({
  suite,
  selectiveSuite,
  proofType,
  cryptosuiteName,
  ...args}) {

  return {...args, suite, selectiveSuite, proofType, cryptosuiteName};
}

export function invalidStringEncoding({suite, selectiveSuite, ...args}) {
  suite._cryptosuite = new Proxy(suite._cryptosuite, {
    get(target, prop) {
      if(prop === 'createProofValue') {
        return mocks.createProofValue;
      }
      // if a stub is not found, return the original property
      return Reflect.get(...arguments);
    }
  });
  return {...args, suite, selectiveSuite};
}
