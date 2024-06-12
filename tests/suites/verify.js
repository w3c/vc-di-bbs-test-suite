/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  verificationFail,
  verificationSuccess
} from '../assertions.js';
import {klona} from 'klona';
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
