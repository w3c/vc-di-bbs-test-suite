/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  checkDataIntegrityProofFormat
} from 'data-integrity-test-suite-assertion';
import {endpoints} from 'vc-test-suite-implementations';

const tag = 'bbs-2023';
const {match} = endpoints.filterByTag({
  tags: [tag],
  property: 'issuers'
});

checkDataIntegrityProofFormat({
  implemented: match,
  testDescription: 'Data Integrity (bbs-2023 issuers)'
});
