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
        const {disclosed, signed} = credentials;
        const cloneTestVector = map => structuredClone(
          map?.get(keyType)?.get(vcVersion));
        it('MUST verify a valid VC with a bbs-2023 proof.',
          async function() {
            const credential = cloneTestVector(disclosed?.base);
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
        it('If the "proofValue" string does not start with "u", an ' +
          'error MUST be raised.', async function() {
          const credential = cloneTestVector(disclosed?.base);
          // intentionally modify proofValue to not start with 'u'
          credential.proof.proofValue = 'a';
          await verificationFail({credential, verifier});
        });
        it('If the "cryptosuite" field is not the string "bbs-2023", ' +
          'an error MUST be raised.', async function() {
          const credential = cloneTestVector(disclosed?.invalid?.cryptosuite);
          await verificationFail({credential, verifier});
        });
        it('If proofConfig.type is not set to DataIntegrityProof and/or ' +
        'proofConfig.cryptosuite is not set to bbs-2023, an ' +
        'INVALID_PROOF_CONFIGURATION error MUST be raised.', async function() {
          const credential = cloneTestVector(
            disclosed?.invalid?.proofTypeAndCryptosuite);
          await verificationFail({credential, verifier});
        });
        it('MUST fail to verify a base proof.', async function() {
          const credential = cloneTestVector(signed);
          await verificationFail({credential, verifier});
        });
        it('MUST fail to verify a modified disclosed credential.',
          async function() {
            const credential = cloneTestVector(disclosed?.base);
            // intentionally modify `credentialSubject` ID
            credential.credentialSubject.id = 'urn:invalid';
            await verificationFail({credential, verifier});
          });
      });
    }
  });
}
