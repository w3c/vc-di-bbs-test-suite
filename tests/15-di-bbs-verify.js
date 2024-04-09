/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  checkDataIntegrityProofVerifyErrors
} from 'data-integrity-test-suite-assertion';
import {endpoints} from 'vc-test-suite-implementations';

const tag = 'bbs-2023';
// only use implementations with `bbs-2023` verifiers.
const {match} = endpoints.filterByTag({
  tags: [tag],
  property: 'verifiers'
});
checkDataIntegrityProofVerifyErrors({
  implemented: match,
  testDescription: 'Data Integrity (bbs-2023 verifiers)'
});
