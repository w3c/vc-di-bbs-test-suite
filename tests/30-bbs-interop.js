/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createDisclosedVc, createInitialVc} from './helpers.js';
import {endpoints} from 'vc-test-suite-implementations';
import {validVc as vc} from './mock-data.js';
import {verificationSuccess} from './assertions.js';

const tag = 'bbs-2023';

// only use implementations with `bbs-2023` issuers.
const {
  match: issuerMatches
} = endpoints.filterByTag({tags: [tag], property: 'issuers'});
const {
  match: verifierMatches
} = endpoints.filterByTag({tags: [tag], property: 'verifiers'});

describe('bbs-2023 (interop)', function() {
  // this will tell the report
  // to make an interop matrix with this suite
  this.matrix = true;
  this.report = true;
  this.implemented = [...verifierMatches.keys()];
  this.rowLabel = 'Issuer';
  this.columnLabel = 'Verifier';
  for(const [issuerName, {endpoints: issuerEndpoints}] of issuerMatches) {
    let disclosedCredential;
    before(async function() {
      const [issuer] = issuerEndpoints;
      const issuedVc = await createInitialVc({issuer, vc});
      const {match: matchingVcHolders} = endpoints.filterByTag({
        tags: ['vcHolder'],
        property: 'vcHolders'
      });
      // Use DB vc holder to create disclosed credentials
      const vcHolders = matchingVcHolders.get('Digital Bazaar').endpoints;
      const vcHolder = vcHolders[0];
      ({disclosedCredential} = await createDisclosedVc({
        selectivePointers: ['/credentialSubject/id'],
        signedCredential: issuedVc,
        vcHolder
      }));
    });
    for(const [verifierName, {endpoints}] of verifierMatches) {
      const [verifier] = endpoints;
      it(`${verifierName} should verify ${issuerName}`, async function() {
        this.test.cell = {rowId: issuerName, columnId: verifierName};
        await verificationSuccess({
          credential: disclosedCredential, verifier
        });
      });
    }
  }
});
