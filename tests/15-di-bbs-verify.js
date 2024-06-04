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
import {getMultiKey} from './vc-generator/key-gen.js';

const tag = 'bbs-2023';
// only use implementations with `bbs-2023` verifiers.
const {match} = endpoints.filterByTag({
  tags: [tag],
  property: 'verifiers'
});
const testDataOptions = {
  suiteName: 'bbs-2023',
  cryptosuite: bbs2023Cryptosuite,
  mandatoryPointers: ['/issuer'],
  selectivePointers: ['/credentialSubject'],
  key: await getMultiKey({keyType: 'P-381'})
};

checkDataIntegrityProofVerifyErrors({
  implemented: match,
  testDescription: 'Data Integrity (bbs-2023 verifiers)',
  testDataOptions
});
