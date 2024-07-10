/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  checkEncoding,
  checkHmacKeyLength,
  shouldBeMultibaseEncoded,
  shouldBeProofValue,
  shouldHaveMandatoryPointers,
  shouldNotUseCborTags,
  shouldVerifyDerivedProof
} from '../assertions.js';
import {createInitialVc, getBs58Bytes, supportsVc} from '../helpers.js';
import chai from 'chai';
import {documentLoader} from '../documentLoader.js';
import {shouldBeUrl} from 'data-integrity-test-suite-assertion';

const should = chai.should();

/**
 * Runs a Mocha Suite on issuer endpoints using the params.
 *
 * @param {object} options - Options to use.
 * @param {Map<string, object>} options.match - Implementations matching a
 *   filter.
 * @param {string} [options.vcVersion = '2.0'] - A vcVersion.
 * @param {object} [options.credentials = {}] - An object with credentials
 *   for the test.
 *
 * @returns {object} - Returns a mocha Suite.
 */
export function createSuite({
  match = new Map(),
  vcVersion = '2.0',
  credentials = {},
}) {
  return describe(`bbs-2023 (issuers) VC Version ${vcVersion}`, function() {
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
        it('The cryptosuite property of the proof MUST be bbs-2023.',
          function() {
            this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=The%20cryptosuite%20property%20of%20the%20proof%20MUST%20be%20bbs%2D2023.';
            proofs.some(
              proof => proof.cryptosuite === 'bbs-2023'
            ).should.equal(true, 'Expected at least one proof to have ' +
              '"cryptosuite" property "bbs-2023".'
            );
          });
        // Checked on 2024-06-30.
        it('The type property of the proof MUST be DataIntegrityProof.',
          function() {
            this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=The%20type%20property%20of%20the%20proof%20MUST%20be%20DataIntegrityProof.';
            bbsProofs.length.should.be.gte(
              1, 'Expected at least one "bbs-2023" proof');
            for(const proof of bbsProofs) {
              should.exist(proof.type, 'Expected "proof.type" to exist.');
              proof.type.should.equal(
                'DataIntegrityProof',
                'Expected "proof.type" to equal "DataIntegrityProof.'
              );
            }
          });
        // Checked on 2024-06-30.
        it('The value of the proofValue property of the proof MUST be a BBS ' +
          'signature or BBS proof produced according to ' +
          '[CFRG-BBS-SIGNATURE] that is serialized and encoded according to ' +
          'procedures in section 3. Algorithms.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=The%20value%20of%20the%20proofValue%20property%20of%20the%20proof%20MUST%20be%20a%20BBS%20signature';
          bbsProofs.length.should.be.gte(
            1, 'Expected at least one "bbs-2023" proof');
          for(const proof of bbsProofs) {
            await shouldBeProofValue(proof.proofValue);
          }
        });
        it('A conforming proof is any concrete expression of the data model ' +
          'that complies with the normative statements in this ' +
          'specification. Specifically, all relevant normative statements ' +
          'in Sections 2. Data Model and 3. Algorithms of this document ' +
          'MUST be enforced.', async function() {
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
        it('The verificationMethod property of the proof MUST be a URL.',
          function() {
            this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=The%20verificationMethod%20property%20of%20the%20proof%20MUST%20be%20a%20URL';
            for(const proof of bbsProofs) {
              shouldBeUrl({
                url: proof.verificationMethod,
                prop: 'proof.verificationMethod'
              });
            }
          });
        // Checked 2024-06-30
        it('Dereferencing "verificationMethod" MUST result in an object ' +
          'containing a type property with "Multikey" value.',
        async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=Dereferencing%20the%20verificationMethod%20MUST%20result%20in%20an%20object%20containing%20a%20type%20property%20with%20the%20value%20set%20to%20Multikey';
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
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=Any%20other%20encodings%20MUST%20NOT%20be%20allowed.';
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
         * Checked on 2024-06-30
         * NOTE: this suite can not control the transformation options so it
         * just checks the proof was created correctly.
         */
        it('The transformation options MUST contain a type identifier for ' +
        'the cryptographic suite (type), a cryptosuite identifier ' +
        '(cryptosuite), and a verification method (verificationMethod).',
        async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=transformation%20options%20MUST%20contain%20a%20type%20identifier%20for%20the%20cryptographic%20suite%20(type)%2C%20a%20cryptosuite%20identifier%20(cryptosuite)%2C%20and%20a%20verification%20method%20(verificationMethod)';
          bbsProofs.length.should.be.gte(
            1, 'Expected at least one "bbs-2023" proof');
          for(const proof of bbsProofs) {
            should.exist(proof.type, 'Expected "proof.type" to exist.');
            proof.type.should.equal(
              'DataIntegrityProof',
              'Expected "proof.type" to equal "DataIntegrityProof.'
            );
            should.exist(
              proof.cryptosuite,
              'Expected "proof.cryptosuite" to exist.'
            );
            proof.cryptosuite.should.equal(
              'bbs-2023',
              'Expected "proof.cryptosuite" to equal "bbs-2023"'
            );
            should.exist(
              proof.verificationMethod,
              'Expected "proof.verificationMethod" to exist.'
            );
            proof.verificationMethod.should.be.a(
              'string',
              'Expected "proof.verificationMethod" to be a string.'
            );
            const [publicKey] = proof.verificationMethod.split('#');
            checkEncoding({
              value: publicKey.substr(8),
              propertyName: 'proof.verificationMethod'
            });
          }
        });
        it('the HMAC key MUST be the same length as the digest size',
          function() {
            this.test.link = 'https://w3c.github.io/vc-di-bbs/#base-proof-transformation-bbs-2023:~:text=the%20HMAC%20key%20MUST%20be%20the%20same%20length%20as%20the%20digest%20size';
            for(const proof of bbsProofs) {
              checkHmacKeyLength({proof, keyLength: 32});
            }
          });
        it('CBOR-encode components per [RFC8949] where CBOR tagging MUST NOT ' +
        'be used on any of the components. Append the produced encoded value ' +
        'to proofValue.', function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#base-proof-transformation-bbs-2023:~:text=and%20signerBlind.-,CBOR%2Dencode%20components%20per%20%5BRFC8949%5D%20where%20CBOR%20tagging%20MUST%20NOT%20be%20used%20on%20any%20of%20the%20components.%20Append%20the%20produced%20encoded%20value%20to%20proofValue.,-Initialize%20baseProof%20to';
          for(const proof of bbsProofs) {
            shouldNotUseCborTags({proof});
          }
        });
        it('The transformation options MUST contain an array of mandatory ' +
        'JSON pointers (mandatoryPointers)', function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=The%20transformation%20options%20MUST%20contain%20an%20array%20of%20mandatory%20JSON%20pointers%20(mandatoryPointers)';
          for(const proof of bbsProofs) {
            shouldHaveMandatoryPointers({proof});
          }
        });
      });
    }
  });
}

