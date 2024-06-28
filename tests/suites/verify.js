/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  verificationFail,
  verificationSuccess
} from '../assertions.js';
import {supportsVc} from '../helpers.js';

/**
 * Runs a Mocha Suite on verifier endpoints using the params.
 *
 * @param {object} options - Options to use.
 * @param {Map<string, object>} options.match - Implementations matching a
 *   filter.
 * @param {string} [options.vcVersion = '2.0'] - A vcVersion.
 * @param {string} [options.keyType = 'P-381'] - A keyType.
 * @param {object} [options.credentials = {}] - An object with credentials
 *   for the test.
 *
 * @returns {object} - Returns a mocha Suite.
 */
export function verifySuite({
  match = new Map(),
  vcVersion = '2.0',
  keyType = 'P-381',
  credentials = {}
}) {
  return describe(`bbs-2023 (verifiers) VC ${vcVersion}`, function() {
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
        const {disclosed, base} = credentials;
        const cloneTestVector = map => structuredClone(
          map?.get(keyType)?.get(vcVersion));
        it('MUST verify a valid VC with a bbs-2023 proof.',
          async function() {
            const credential = cloneTestVector(disclosed?.basic);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify a valid VC with nested disclosed properties.',
          async function() {
            const credential = cloneTestVector(disclosed?.nested);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify a valid VC with disclosed properties and bnodes.',
          async function() {
            const credential = cloneTestVector(disclosed?.noIds);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify with full array revealed properties',
          async function() {
            const credential = cloneTestVector(disclosed?.array?.full);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify with fewer array revealed properties',
          async function() {
            const credential = cloneTestVector(disclosed?.array?.lessThanFull);
            await verificationSuccess({credential, verifier});
          });
        it('MUST verify w/o first element revealed properties',
          async function() {
            const credential = cloneTestVector(
              disclosed?.array?.missingElements);
            await verificationSuccess({credential, verifier});
          });
        it('If the proofValue string does not start with u (U+0075 LATIN ' +
            'SMALL LETTER U), indicating that it is a multibase-base64url' +
            '-no-pad-encoded value, an error MUST be raised and SHOULD ' +
            'convey an error type of PROOF_VERIFICATION_ERROR.',
        async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=If%20the%20proofValue%20string%20does%20not%20start%20with%20u%20(U%2B0075%20LATIN%20SMALL%20LETTER%20U)%2C%20indicating%20that%20it%20is%20a%20multibase%2Dbase64url%2Dno%2Dpad%2Dencoded%20value%2C%20an%20error%20MUST%20be%20raised%20and%20SHOULD%20convey%20an%20error%20type%20of%20PROOF_VERIFICATION_ERROR.';
          const credential = cloneTestVector(disclosed?.basic);
          // intentionally modify proofValue to not start with 'u'
          credential.proof.proofValue = 'a' +
            credential.proof.proofValue.substr(1);
          //FIXME assert on error type in the future
          await verificationFail({credential, verifier});
        });
        it('If the "cryptosuite" field is not the string "bbs-2023", ' +
          'an error MUST be raised.', async function() {
          const credential = cloneTestVector(disclosed?.invalid?.cryptosuite);
          await verificationFail({credential, verifier});
        });
        it('If proofConfig.type is not set to DataIntegrityProof and/or ' +
            'proofConfig.cryptosuite is not set to bbs-2023, an error MUST ' +
            'be raised and SHOULD convey an error type of ' +
            'PROOF_GENERATION_ERROR.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=If%20proofConfig.type%20is%20not%20set%20to%20DataIntegrityProof%20and/or%20proofConfig.cryptosuite%20is%20not%20set%20to%20bbs%2D2023%2C%20an%20error%20MUST%20be%20raised%20and%20SHOULD%20convey%20an%20error%20type%20of%20PROOF_GENERATION_ERROR.';
          await verificationFail({
            credential: cloneTestVector(
              disclosed?.invalid?.proofTypeAndCryptosuite),
            verifier
          });
          await verificationFail({
            credential: cloneTestVector(
              disclosed?.invalid?.cryptosuite),
            verifier
          });
          await verificationFail({
            credential: cloneTestVector(
              disclosed?.invalid?.proofType),
            verifier
          });
        });
        it('Whenever this algorithm (base proof) encodes strings, it MUST ' +
          'use UTF-8 encoding.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#serializebaseproofvalue:~:text=Whenever%20this%20algorithm%20encodes%20strings%2C%20it%20MUST%20use%20UTF%2D8%20encoding.';
          const credential = cloneTestVector(disclosed?.invalid?.nonUTF8);
          await verificationFail({credential, verifier});
        });
        it('The proof options MUST contain a type identifier for the ' +
        'cryptographic suite (type) and MUST contain a cryptosuite ' +
        'identifier (cryptosuite). A proof configuration object is produced ' +
        'as output.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#linkage-via-proof-options-and-mandatory-reveal:~:text=The%20proof%20options%20MUST%20contain%20a%20type%20identifier%20for%20the%20cryptographic%20suite%20(type)%20and%20MUST%20contain%20a%20cryptosuite%20identifier%20(cryptosuite).%20A%20proof%20configuration%20object%20is%20produced%20as%20output.';
          await verificationFail({
            credential: cloneTestVector(
              disclosed?.invalid?.noProofTypeOrCryptosuite),
            verifier
          });
          await verificationFail({
            credential: cloneTestVector(disclosed?.invalid?.noProofType),
            verifier
          });
          await verificationFail({
            credential: cloneTestVector(disclosed?.invalid?.noCryptosuite),
            verifier
          });
        });
        it('CBOR-encode components per [RFC8949] where CBOR tagging MUST NOT ' +
        'be used on any of the components. Append the produced encoded value ' +
        'to proofValue.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#base-proof-transformation-bbs-2023:~:text=and%20pseudonym.-,CBOR%2Dencode%20components%20per%20%5BRFC8949%5D%20where%20CBOR%20tagging%20MUST%20NOT%20be%20used%20on%20any%20of%20the%20components.%20Append%20the%20produced%20encoded%20value%20to%20proofValue.,-Return%20the%20derived';
          await verificationFail({
            credential: cloneTestVector(disclosed?.invalid?.cborg),
            verifier
          });
        });
        it('If proofConfig.created is set and the value is not a valid ' +
        '[XMLSCHEMA11-2] datetime, an INVALID_PROOF_DATETIME error MUST be ' +
        'raised.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#linkage-via-proof-options-and-mandatory-reveal:~:text=If%20proofConfig.created%20is%20set%20and%20if%20the%20value%20is%20not%20a%20valid%20%5BXMLSCHEMA11%2D2%5D%20datetime%2C%20an%20INVALID_PROOF_DATETIME%20error%20MUST%20be%20raised.';
          const credential = cloneTestVector(disclosed?.invalid?.created);
          //FIXME assert on error code or message when available
          await verificationFail({credential, verifier});
        });
        it('MUST fail to verify a base proof.', async function() {
          const credential = cloneTestVector(base);
          await verificationFail({credential, verifier});
        });
        it('MUST fail to verify a modified disclosed credential.',
          async function() {
            const credential = cloneTestVector(disclosed?.basic);
            // intentionally modify `credentialSubject` ID
            credential.credentialSubject.id = 'urn:invalid';
            await verificationFail({credential, verifier});
          });
        it('If the decodedProofValue starts with any other three byte ' +
          'sequence, an error MUST be raised and SHOULD convey an error ' +
          'type of PROOF_VERIFICATION_ERROR.', async function() {
          this.test.link = 'https://w3c.github.io/vc-di-bbs/#:~:text=If%20the%20decodedProofValue%20starts%20with%20any%20other%20three%20byte%20sequence%2C%20an%20error%20MUST%20be%20raised%20and%20SHOULD%20convey%20an%20error%20type%20of%20PROOF_VERIFICATION_ERROR.';
          const credential = cloneTestVector(disclosed?.invalid?.valuePrefix);
          await verificationFail({credential, verifier});
        });
      });
    }
  });
}
