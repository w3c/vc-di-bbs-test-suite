/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {createSuite} from './suites/create.js';
import {endpoints} from 'vc-test-suite-implementations';
import {getSuiteConfig} from './test-config.js';

const tag = 'bbs-2023';
const {tags, credentials, vectors} = getSuiteConfig(tag);
const {match} = endpoints.filterByTag({
  tags: [...tags],
  property: 'issuers'
});

describe('bbs-2023 (create)', async function() {
  for(const vcVersion of vectors.vcTypes) {
    for(const keyType of vectors.keyTypes) {
      createSuite({
        match,
        vcVersion,
        keyType,
        credentials: credentials.create
      });
    }
  }
});
