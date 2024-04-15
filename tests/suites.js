/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {createInitialVc, getBs58Bytes, supportsVc} from './helpers.js';
import {
  shouldBeMultibaseEncoded,
  verificationFail,
  verificationSuccess
} from './assertions.js';
import chai from 'chai';
import {documentLoader} from './documentLoader.js';
import {klona} from 'klona';

const should = chai.should();

export function createSuite({
  match = new Map(),
  vcVersion = '2.0',
  credentials = {},
  tag
}) {
  describe(`bbs-2023 (issuers) VC Version ${vcVersion}`, function() {
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Implementation';
    for(const [name, {endpoints, implementation}] of match) {
      const [issuer] = endpoints;
      if(!supportsVc({vcVersion, endpoint: issuer})) {
        continue;
      }
      describe(name, function() {

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
          issuedVc = await createInitialVc({
            issuer,
            vc: credentials[vcVersion].credential,
            mandatoryPointer: credentials[vcVersion].mandatoryPointers,
            addIssuanceDate: (vcVersion === '1.1')
          });
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
        /*
        * Checked on 04-15-2024.
        * {@link https://w3c.github.io/vc-di-bbs/#dataintegrityproof}
        * Link to relevant section above.
        */
        it('The value of the proofValue property of the proof MUST be a BBS ' +
          'signature or BBS proof produced according to ' +
          '[CFRG-BBS-SIGNATURE] that is serialized and encoded according to ' +
          'procedures in section 3. Algorithms.', function() {
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
}

export function verifySuite({
  match = new Map(),
  vcVersion = '2.0',
  keyType = 'P-381',
  credentials = {}
}) {
  describe(`bbs-2023 (verifiers) VC ${vcVersion}`, function() {
    // this will tell the report
    // to make an interop matrix with this suite
    this.matrix = true;
    this.report = true;
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Verifier';
    this.implemented = [...match.keys()];
    for(const [name, {endpoints}] of match) {
      const [verifier] = endpoints;
      if(!supportsVc({vcVersion, endpoint: verifier})) {
        continue;
      }
      describe(name, function() {
        beforeEach(function() {
          this.currentTest.cell = {
            columnId: name, rowId: this.currentTest.title
          };
        });
        const {disclosed, signed} = credentials;
        const getTestVector = map => map?.get(keyType)?.get(vcVersion);
        it('MUST verify a valid VC with a bbs-2023 proof.',
          async function() {
            const credential = getTestVector(disclosed?.base);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify a valid VC with nested disclosed properties.',
          async function() {
            const credential = getTestVector(disclosed?.nested);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify a valid VC with disclosed properties and bnodes.',
          async function() {
            const credential = getTestVector(disclosed?.noIds);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify with full array revealed properties',
          async function() {
            const credential = getTestVector(disclosed?.array?.full);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify with fewer array revealed properties',
          async function() {
            const credential = getTestVector(disclosed?.array?.lessThanFull);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify w/o first element revealed properties',
          async function() {
            const credential = getTestVector(disclosed?.array?.missingElements);
            await verificationSuccess({credential, verifier});
          });
        it('If the "proofValue" string does not start with "u", an ' +
          'error MUST be raised.', async function() {
          const credential = getTestVector(disclosed?.base);
          const signedCredentialCopy = klona(credential);
          // intentionally modify proofValue to not start with 'u'
          signedCredentialCopy.proof.proofValue = 'a';
          await verificationFail({
            credential: signedCredentialCopy, verifier
          });
        });
        it('If the "cryptosuite" field is not the string "bbs-2023", ' +
          'an error MUST be raised.', async function() {
          const credential = getTestVector(disclosed?.base);
          const signedCredentialCopy = klona(credential);
          signedCredentialCopy.proof.cryptosuite = 'invalid-cryptosuite';
          await verificationFail({
            credential: signedCredentialCopy, verifier
          });
        });
        it('MUST fail to verify a base proof.', async function() {
          const credential = getTestVector(signed);
          const signedCredentialCopy = klona(credential);
          await verificationFail({
            credential: signedCredentialCopy, verifier
          });
        });
        it('MUST fail to verify a modified disclosed credential.',
          async function() {
            const credential = getTestVector(disclosed?.base);
            const signedCredentialCopy = klona(credential);
            // intentionally modify `credentialSubject` ID
            signedCredentialCopy.credentialSubject.id = 'urn:invalid';
            await verificationFail({
              credential: signedCredentialCopy, verifier
            });
          });
      });
    }
  });
}
