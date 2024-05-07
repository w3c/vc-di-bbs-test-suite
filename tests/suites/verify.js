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
        it('The transformation options MUST contain a type identifier for ' +
        'the cryptographic suite (type), a cryptosuite identifier ' +
        '(cryptosuite), and a verification method (verificationMethod).',
        async function() {
          const baseReason = 'Should not verify a VC with no ';
          const vectors = new Map([
            ['type identifier', ['type']],
            ['cryptosuite identifier', ['cryptosuite']],
            ['verificationMethod', ['verificationMethod']],
            ['type & no cryptosuite identifier', ['type', 'cryptosuite']],
            [
              'type identifier & no verificationMethod',
              ['type', 'verificationMethod']
            ],
            [
              'cryptosuite identifier & no verificationMethod',
              ['cryptosuite', 'verificationMethod']
            ],
            [
              'type & no cryptosuite identifier & no verificationMethod',
              ['type', 'cryptosuite', 'verificationMethod']
            ]
          ]);
          for(const [testReason, terms] of vectors) {
            const credential = klona(getTestVector(disclosed?.base));
            for(const prop of terms) {
              credential.proof[prop] = '';
            }
            await verificationFail({
              credential,
              verifier,
              reason: `${baseReason}${testReason}`
            });
          }
        });
      });
    }
  });
}
