/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {createDisclosedVc, createInitialVc} from './helpers.js';
import {endpoints} from 'vc-test-suite-implementations';
import {getSuiteConfig} from './test-config.js';
import {verificationSuccess} from './assertions.js';

const tag = 'bbs-2023';
const {
  disableInterop,
  credentials,
  tags,
  vcHolder: holderSettings
} = getSuiteConfig(tag);

// only use implementations with `bbs-2023` issuers.
const {
  match: issuerMatches
} = endpoints.filterByTag({tags: [...tags], property: 'issuers'});
const {
  match: verifierMatches
} = endpoints.filterByTag({tags: [...tags], property: 'verifiers'});

(disableInterop ? describe.skip : describe)('bbs-2023 (interop)', function() {
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
      const issuedVc = await createInitialVc({
        issuer,
        vc: credentials.interop['2.0'].credential,
        mandatoryPointers: credentials.interop['2.0'].mandatoryPointers,
        addIssuanceDate: false
      });
      const {match: matchingVcHolders} = endpoints.filterByTag({
        tags: [...holderSettings.tags],
        property: 'vcHolders'
      });
      // Use DB vc holder to create disclosed credentials
      const vcHolders = matchingVcHolders.get(
        holderSettings.holderName).endpoints;
      const vcHolder = vcHolders.find(endpoint => endpoint.tags.has(tag));
      ({disclosedCredential} = await createDisclosedVc({
        selectivePointers: [
          '/credentialSubject/id',
          '/credentialSubject/driversLicense/document_number'
        ],
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
