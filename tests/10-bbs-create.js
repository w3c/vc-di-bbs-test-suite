/*!
 * Copyright 2023 Digital Bazaar, Inc. All Rights Reserved
 */
import chai from 'chai';
import {
  checkDataIntegrityProofFormat
} from 'data-integrity-test-suite-assertion';
import {createInitialVc} from './helpers.js';
import {documentLoader} from './documentLoader.js';
import {endpoints} from 'vc-test-suite-implementations';
import {validVc as vc} from './mock-data.js';
import {verificationSuccess} from './assertions.js';

const tag = 'bbs-2023';
const {match} = endpoints.filterByTag({
  tags: [tag],
  property: 'issuers'
});
const should = chai.should();

describe('bbs-2023 (create)', function() {
  checkDataIntegrityProofFormat({
    implemented: match,
    testDescription: 'Data Integrity (bbs-2023 issuers)'
  });
  describe('bbs-2023 (issuers)', function() {
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Implementation';
    for(const [name, {endpoints, implementation}] of match) {
      describe(name, function() {
        const [issuer] = endpoints;
        const verifier = implementation.verifiers.filter(
          v => v.tags.has(tag));
        let issuedVc;
        let proofs;
        // const verificationMethodDocuments = [];
        before(async function() {
          issuedVc = await createInitialVc({issuer, vc});
          proofs = Array.isArray(issuedVc?.proof) ? issuedVc.proof :
            [issuedVc?.proof];
          // FIXME: Update documentLoader to support BLS12-381 cryptographic key
          // const verificationMethods = proofs.map(
          //   proof => proof.verificationMethod);
          // for(const verificationMethod of verificationMethods) {
          //   const verificationMethodDocument = await documentLoader({
          //     url: verificationMethod
          //   });
          //   verificationMethodDocuments.push(verificationMethodDocument);
          // }
        });
        it('The field "cryptosuite" MUST be "bbs-2023".', function() {
          this.test.cell = {
            columnId: name, rowId: this.test.title
          };
          proofs.some(
            proof => proof.cryptosuite === 'bbs-2023'
          ).should.equal(true, 'Expected at least one proof to have ' +
            '"cryptosuite" property "bbs-2023".'
          );
        });
        it.skip('The value of the "proofValue" property MUST be a BBS ' +
          'signature or BBS proof produced according to `CFRG-BBS-SIGNATURE`.',
        function() {
          this.test.cell = {
            columnId: name, rowId: this.test.title
          };
        });
        it('The "proof" MUST verify when using a conformant verifier.',
          async function() {
            this.test.cell = {
              columnId: name, rowId: this.test.title
            };
            should.exist(verifier, 'Expected implementation to have a VC ' +
            'HTTP API compatible verifier.');
            verificationSuccess({credential: issuedVc, verifier});
          });
        it.skip('The "proof.proofPurpose" field MUST match the verification ' +
          'relationship expressed by the verification method controller.',
        async function() {
          this.test.cell = {
            columnId: name, rowId: this.test.title
          };
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            'at least one "verificationMethodDocument".');
          verificationMethodDocuments.some(
            verificationMethodDocument =>
              verificationMethodDocument?.type === 'Multikey'
          ).should.equal(true, 'Expected at least one proof to have ' +
            '"type" property value "Multikey".'
          );
          const controllerDocuments = [];
          for(
            const verificationMethodDocument of verificationMethodDocuments
          ) {
            const controllerDocument = await documentLoader({
              url: verificationMethodDocument.controller
            });
            controllerDocuments.push(controllerDocument);
          }
          proofs.some(
            proof => controllerDocuments.some(controllerDocument =>
              controllerDocument.hasOwnProperty(proof.proofPurpose))
          ).should.equal(true, 'Expected "proof.proofPurpose" field ' +
            'to match the verification method controller.'
          );
        });
        it.skip('Dereferencing "verificationMethod" MUST result in an object ' +
          'containing a type property with "Multikey" value.',
        async function() {
          this.test.cell = {
            columnId: name, rowId: this.test.title
          };
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            'at least one "verificationMethodDocument".');
          verificationMethodDocuments.some(
            verificationMethodDocument =>
              verificationMethodDocument?.type === 'Multikey'
          ).should.equal(true, 'Expected at least one proof to have ' +
            '"type" property value "Multikey".'
          );
        });
        it.skip('The publicKeyMultibase property MUST be a Multibase-encoded ' +
          'Multikey expression of BLS12-381 public key in the G2 group.',
        async function() {
          this.test.cell = {
            columnId: name, rowId: this.test.title
          };
        });
      });
    }
  });
});
