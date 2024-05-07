/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {endpoints} from 'vc-test-suite-implementations';
import {getSuiteConfig} from './test-config.js';
import {verifySetup} from './setup.js';
import {verifySuite} from './suites/verify.js';

const tag = 'bbs-2023';
const {
  credentials,
  tags,
  vectors
} = getSuiteConfig(tag);
// only use implementations with `bbs-2023` verifiers.
const {match} = endpoints.filterByTag({
  tags: [...tags],
  property: 'verifiers'
});
const testVectors = await verifySetup({
  credentials,
  keyTypes: vectors.keyTypes,
  suite: tag
});
describe('bbs-2023 (verify)', async function() {
  for(const vcVersion of vectors.vcTypes) {
    for(const keyType of vectors.keyTypes) {
      await verifySuite({
        match,
        vcVersion,
        keyType,
        credentials: testVectors
      });
    }
  }
});
