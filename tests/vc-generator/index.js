/*!
 * Copyright 2023-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as vc from '@digitalbazaar/vc';
import {documentLoader as defaultLoader} from './documentLoader.js';
import {getMultikeys} from './key-gen.js';
import {getSuite} from './cryptosuites.js';
import {issueCloned} from 'data-integrity-test-suite-assertion';

/**
 * Issues test data locally and then returns a Map
 * with the test data.
 *
 * @param {object} options - Options to use.
 * @param {Map<string, object>} options.credentials - Versioned unsigned
 *   credentials.
 * @param {Function} [options.documentLoader = defaultLoader] - A
 * documentLoader(url).
 * @param {string} options.suite - A cryptosuite id.
 * @param {Array<string>} options.keyTypes - A Set of keyTypes to issue with.
 *
 * @returns {Promise<Map<string, object>>} Returns a Map <keyType, vc>.
 */
export async function issueCredentials({
  credentials,
  suite,
  documentLoader = defaultLoader,
  keyTypes = ['P-381']
}) {
  const results = new Map();
  const keys = await getMultikeys({keyTypes});
  for(const [keyType, {signer, issuer}] of keys) {
    const versionedVcs = new Map();
    for(const [vcVersion, {credential, mandatoryPointers}] of credentials) {
      const _vc = await issueCredential({
        credential,
        documentLoader,
        issuer,
        signer,
        suite,
        mandatoryPointers
      });
      versionedVcs.set(vcVersion, _vc);
    }
    results.set(keyType, versionedVcs);
  }
  return results;
}

export async function issueCredential({
  credential,
  documentLoader = defaultLoader,
  issuer,
  signer,
  suite,
  mandatoryPointers = []
}) {
  const _credential = structuredClone(credential);
  _credential.issuer = issuer;
  return vc.issue({
    credential: _credential,
    documentLoader,
    suite: getSuite({signer, suite, mandatoryPointers})
  });
}

export async function deriveCredential({
  documentLoader = defaultLoader,
  verifiableCredential,
  suite,
  signer,
  selectivePointers = []
}) {
  return vc.derive({
    verifiableCredential,
    documentLoader,
    suite: getSuite({signer, suite, selectivePointers})
  });
}

export async function verifyCredential({
  documentLoader = defaultLoader,
  credential,
  suite
}) {
  return vc.verifyCredential({
    credential,
    documentLoader,
    suite: getSuite({suite, verify: true})
  });
}

export async function deriveCredentials({
  documentLoader = defaultLoader,
  keys,
  vectors,
  map = new Map(),
  suiteName,
  initialParams,
  generators = []
}) {
  for(const [keyType, {signer, issuer}] of keys) {
    map.set(keyType, new Map());
    for(const [vcVersion, vector] of vectors) {
      const {credential, mandatoryPointers, selectivePointers} = vector;
      const _credential = structuredClone(credential);
      _credential.issuer = issuer;
      // the first params passed to the first generator
      const initParams = {
        suite: getSuite({suite: suiteName, signer, mandatoryPointers}),
        selectiveSuite: getSuite({suite: suiteName, signer, selectivePointers}),
        credential: _credential,
        loader: documentLoader,
        // add the ability to overwrite the defaults
        ...initialParams
      };
      // call each generator on itself to produce accumulated invalid suites
      // and vectors
      const testData = generators.reduce((accumulator, current) =>
        current(accumulator), initParams);
      testData.loader = documentLoader;
      const vc = await issueCloned(testData);
      map.get(keyType).set(vcVersion, vc);
    }
  }
  return map;
}

export {getSuite, getMultikeys};
