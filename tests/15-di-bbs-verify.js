/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as bbs2023Cryptosuite from '@digitalbazaar/bbs-2023-cryptosuite';
import {
  checkDataIntegrityProofVerifyErrors
} from 'data-integrity-test-suite-assertion';
import {endpoints} from 'vc-test-suite-implementations';
import {filterVerifiers} from './helpers.js';
import {getMultiKey} from './vc-generator/key-gen.js';
import {getSuiteConfig} from './test-config.js';

const tag = 'bbs-2023';
const {tags, credentials, vectors} = getSuiteConfig(tag);
const key = await getMultiKey({keyType: 'P-381'});
const subjectNestedObjects = credentials.verify;

for(const vcVersion of vectors.vcTypes) {
  const {match} = endpoints.filter({
    filter: filterVerifiers.bind({vcVersion, tags})
  });
  checkDataIntegrityProofVerifyErrors({
    implemented: match,
    testDescription: `Data Integrity (bbs-2023 verifiers) VC ${vcVersion}`,
    optionalTests: {
      // do not run proof.created tests on bbs
      created: false,
      authentication: true
    },
    testDataOptions: {
      suiteName: 'bbs-2023',
      key,
      cryptosuite: bbs2023Cryptosuite,
      mandatoryPointers: subjectNestedObjects[vcVersion].mandatoryPointers,
      selectivePointers: subjectNestedObjects[vcVersion].selectivePointers,
      testVector: subjectNestedObjects[vcVersion].credential
    }
  });
}

