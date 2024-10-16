/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {exportFixtures, verifySetup} from './setup.js';
import {endpoints} from 'vc-test-suite-implementations';
import {getSuiteConfig} from './test-config.js';
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
  after(async function() {
    try {
      const {base, disclosed} = testVectors;
      const path = file => `./reports/${file}.json`;
      await exportFixtures(base, path('base-fixtures'));
      await exportFixtures(
        disclosed,
        path('derived-fixtures')
      );
    } catch(e) {
      console.error('Failed to export test fixtures', e);
    }
  });
  for(const vcVersion of vectors.vcTypes) {
    for(const keyType of vectors.keyTypes) {
      verifySuite({
        match,
        vcVersion,
        keyType,
        credentials: testVectors
      });
    }
  }
});
