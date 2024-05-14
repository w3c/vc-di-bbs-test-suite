/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {createInitialVc, getBs58Bytes, supportsVc} from '../helpers.js';
import {
  shouldBeMultibaseEncoded,
  shouldBeProofValue,
  shouldVerifyDerivedProof
} from '../assertions.js';
import chai from 'chai';
import {documentLoader} from '../documentLoader.js';

const should = chai.should();

export function createSuite({
  match = new Map(),
  vcVersion = '2.0',
  credentials = {},
}) {
  describe(`bbs-2023 (issuers) VC Version ${vcVersion}`, function() {
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Implementation';
    for(const [name, {endpoints}] of match) {
      const [issuer] = endpoints;
      if(!supportsVc({vcVersion, endpoint: issuer})) {
        continue;
      }
      describe(name, function() {

        let issuedVc;
        let proofs;
        let bbsProofs;
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
            mandatoryPointers: credentials[vcVersion].mandatoryPointers,
            addIssuanceDate: (vcVersion === '1.1')
          });
          proofs = Array.isArray(issuedVc?.proof) ? issuedVc.proof :
            [issuedVc?.proof];
          bbsProofs = proofs.filter(
            proof => proof.cryptosuite === 'bbs-2023');
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
         * Checked on 2024-04-17.
         * {@link https://w3c.github.io/vc-di-bbs/#create-base-proof-bbs-2023:~:text=The%20type%20property%20of%20the%20proof%20MUST%20be%20DataIntegrityProof.}
         */
        it('The type property of the proof MUST be DataIntegrityProof.',
          function() {
            bbsProofs.length.should.be.gte(
              1,
              'Expected at least one "bbs-2023" proof'
            );
            for(const proof of bbsProofs) {
              should.exist(proof.type, 'Expected "proof.type" to exist.');
              proof.type.should.equal(
                'DataIntegrityProof',
                'Expected "proof.type" to equal "DataIntegrityProof.'
              );
            }
          });
        /*
        * Checked on 2024-04-15.
        * {@link https://w3c.github.io/vc-di-bbs/#dataintegrityproof:~:text=The%20value%20of%20the%20proofValue%20property%20of%20the%20proof%20MUST%20be%20a%20BBS%20signature%20or%20BBS%20proof%20produced%20according%20to%20%5BCFRG%2DBBS%2DSIGNATURE%5D%20that%20is%20serialized%20and%20encoded%20according%20to%20procedures%20in%20section%203.%20Algorithms.}
        * Link to relevant section above.
        */
        it('The value of the proofValue property of the proof MUST be a BBS ' +
          'signature or BBS proof produced according to ' +
          '[CFRG-BBS-SIGNATURE] that is serialized and encoded according to ' +
          'procedures in section 3. Algorithms.', async function() {
          bbsProofs.length.should.be.gte(
            1,
            'Expected at least one "bbs-2023" proof'
          );
          for(const proof of bbsProofs) {
            await shouldBeProofValue(proof.proofValue);
          }
        });
        it('The derived "proof" MUST verify when using a conformant verifier.',
          async function() {
            await shouldVerifyDerivedProof({verifiableCredential: issuedVc});
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
        /*
         * Checked on 2024-04-16
         * {@link https://w3c.github.io/vc-di-bbs/#create-base-proof-bbs-2023:~:text=The%20transformation%20options%20MUST%20contain%20a%20type%20identifier%20for%20the%20cryptographic%20suite%20(type)%2C%20a%20cryptosuite%20identifier%20(cryptosuite)%2C%20and%20a%20verification%20method%20(verificationMethod).}
         *
         * NOTE: this suite can not control the transformation options so it
         * just checks the proof was created correctly.
         */
        it('The transformation options MUST contain a type identifier for ' +
        'the cryptographic suite (type), a cryptosuite identifier ' +
        '(cryptosuite), and a verification method (verificationMethod).',
        async function() {
        });
      });
    }
  });
}

