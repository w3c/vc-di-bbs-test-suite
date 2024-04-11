/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createInitialVc, getBs58Bytes} from './helpers.js';
import {shouldBeMultibaseEncoded, verificationSuccess} from './assertions.js';
import chai from 'chai';
import {documentLoader} from './documentLoader.js';
import {endpoints} from 'vc-test-suite-implementations';
import {getSuiteConfig} from './test-config.js';
import {validVc as vc} from './mock-data.js';

const tag = 'bbs-2023';
const {tags} = getSuiteConfig(tag);
const {match} = endpoints.filterByTag({
  tags: [...tags],
  property: 'issuers'
});
const should = chai.should();

describe('bbs-2023 (create)', function() {
  describe('bbs-2023 (issuers)', function() {
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Implementation';
    for(const [name, {endpoints, implementation}] of match) {
      describe(name, function() {
        const [issuer] = endpoints;
        const verifier = implementation.verifiers.find(
          v => v.tags.has(tag));
        let issuedVc;
        let proofs;
        const verificationMethodDocuments = [];
        beforeEach(function() {
          this.currentTest.cell = {
            columnId: name, rowId: this.currentTest.title
          };
        });
        before(async function() {
          issuedVc = await createInitialVc({issuer, vc});
          proofs = Array.isArray(issuedVc?.proof) ? issuedVc.proof :
            [issuedVc?.proof];
          const verificationMethods = proofs.map(
            proof => proof.verificationMethod);
          for(const verificationMethod of verificationMethods) {
            const verificationMethodDocument = await documentLoader({
              url: verificationMethod
            });
            verificationMethodDocuments.push(verificationMethodDocument);
          }
        });
        it('The field "cryptosuite" MUST be "bbs-2023".', function() {
          proofs.some(
            proof => proof.cryptosuite === 'bbs-2023'
          ).should.equal(true, 'Expected at least one proof to have ' +
            '"cryptosuite" property "bbs-2023".'
          );
        });
        it.skip('The value of the "proofValue" property MUST be a BBS ' +
          'signature or BBS proof produced according to `CFRG-BBS-SIGNATURE`.',
        function() {
        });
        it('The "proof" MUST verify when using a conformant verifier.',
          async function() {
            should.exist(verifier, 'Expected implementation to have a VC ' +
            'HTTP API compatible verifier.');
            await verificationSuccess({credential: issuedVc, verifier});
          });
        it.skip('The "proof.proofPurpose" field MUST match the verification ' +
          'relationship expressed by the verification method controller.',
        async function() {
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
        it('Dereferencing "verificationMethod" MUST result in an object ' +
          'containing a type property with "Multikey" value.',
        async function() {
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            'at least one "verificationMethodDocument".');
          verificationMethodDocuments.some(
            verificationMethodDocument =>
              verificationMethodDocument?.type === 'Multikey'
          ).should.equal(true, 'Expected at least one proof to have ' +
            '"type" property value "Multikey".'
          );
        });
        it('The publicKeyMultibase property represents a Multibase-encoded ' +
        'Multikey expression of a BLS12-381 public key in the G2 group. The ' +
        'encoding of this field is the two-byte prefix 0xeb01 followed by ' +
        'the 96-byte compressed public key data. The 98-byte value is then ' +
        'encoded using base58-btc (z) as the prefix. Any other encodings ' +
        'MUST NOT be allowed.',
        async function() {
          verificationMethodDocuments.should.not.eql([], 'Expected ' +
            'at least one "verificationMethodDocument".');
          const proof = proofs.find(p => p.cryptosuite === 'bbs-2023');
          should.exist(
            proof,
            'Expected at least one proof with cryptosuite "bbs-2023"'
          );
          const vm = verificationMethodDocuments.find(
            vm => vm.id === proof.verificationMethod);
          should.exist(
            vm,
            `Expected at least one verificationMethod with id ` +
            `"${proof.verificationMethod}"`
          );
          should.exist(
            vm.publicKeyMultibase,
            'Expected verificationMethod to have property "publicKeyMultibase"'
          );
          await shouldBeMultibaseEncoded({
            value: vm.publicKeyMultibase,
            prefixes: {
              multibase: 'z',
              multicodec: new Uint8Array([0xeb, 0x01])
            },
            decoder: getBs58Bytes,
            propertyName: 'publicKeyMultibase',
            expectedLength: 98
          });
        });
      });
    }
  });
});
