/*!
 * Copyright 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as base64url from 'base64url-universal';
import {
  allowUnsafeCanonize,
  invalidCborEncoding,
  invalidStringEncoding,
  passCreated
} from './vc-generator/generators.js';
import {
  deriveCredentials,
  getMultikeys,
  issueCredentials
} from './vc-generator/index.js';
import {generators} from 'data-integrity-test-suite-assertion';

export async function verifySetup({credentials, keyTypes, suite}) {
  const disclosed = {
    //disclosedCredentials
    basic: new Map(),
    array: {
      //disclosedCredentialsWithFullArray
      full: new Map(),
      //disclosedCredentialsWithLessThanFullSubArray
      lessThanFull: new Map(),
      //disclosedCredentialsWithoutFirstArrayElement
      missingElements: new Map()
    },
    invalid: {
      // invalid "proof.type" and "proof.cryptosuite"
      proofTypeAndCryptosuite: new Map(),
      // invalid "proof.cryptosuite"
      cryptosuite: new Map(),
      // for invalid string encoding test
      nonUTF8: new Map(),
      // invalid cbor encoding
      cbor: new Map()
    }
  };
  const {subjectNestedObjects, subjectHasArrays} = credentials.verify;
  const keys = await getMultikeys({keyTypes});
  // takes an object with keys versions values vector and
  // transforms the vectors
  const transformVectors = (obj, func = id => id) => Object.entries(obj).map(
    input => {
      const [vcVersion, vector] = input;
      return [vcVersion, func(structuredClone(vector))];
    });

  // create initial base proofs
  const base = await issueCredentials({
    credentials: Object.entries(subjectNestedObjects),
    suite,
    keyTypes
  });
  const disclosedBasicVectors = transformVectors(
    subjectNestedObjects,
    vector => {
      vector.selectivePointers = ['/credentialSubject/id'];
      return vector;
    });
  // use initial VCs for a basic selective disclosure test
  disclosed.basic = await deriveCredentials({
    vectors: disclosedBasicVectors,
    suiteName: suite,
    keys
  });
  const {mandatory, dates} = generators;
  const {invalidCreated} = dates;
  const {invalidCryptosuite, invalidProofType} = mandatory;
  disclosed.invalid.proofTypeAndCryptosuite =
    await deriveCredentials({
      keys,
      vectors: disclosedBasicVectors,
      suiteName: suite,
      generators: [invalidProofType, invalidCryptosuite]
    });
  disclosed.invalid.cryptosuite = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    generators: [invalidCryptosuite]
  });
  disclosed.invalid.proofType = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    generators: [invalidProofType]
  });
  disclosed.invalid.noProofTypeOrCryptosuite = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    initialParams: {
      proofType: '',
      cryptosuiteName: ''
    },
    // add a generator to turn safe mode off for proof, canonize, and hash
    generators: [allowUnsafeCanonize, invalidProofType, invalidCryptosuite]
  });
  disclosed.invalid.noProofType = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    initialParams: {
      proofType: '',
    },
    // add a generator to turn safe mode off for proof, canonize, and hash
    generators: [allowUnsafeCanonize, invalidProofType]
  });
  disclosed.invalid.noCryptosuite = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    initialParams: {
      cryptosuiteName: ''
    },
    // add a generator to turn safe mode off for proof, canonize, and hash
    generators: [allowUnsafeCanonize, invalidCryptosuite]
  });
  disclosed.invalid.nonUTF8 = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    generators: [invalidStringEncoding]
  });
  disclosed.invalid.cbor = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    generators: [invalidCborEncoding]
  });
  disclosed.invalid.created = await deriveCredentials({
    keys,
    vectors: transformVectors(subjectNestedObjects),
    suiteName: suite,
    generators: [invalidCreated, passCreated]
  });
  const valuePrefix = new Map();
  for(const [keyType, versions] of disclosed?.basic) {
    valuePrefix.set(keyType, new Map());
    for(const [vcVersion, vc] of versions) {
      const modifiedVc = structuredClone(vc);
      const proofValue = base64url.decode(modifiedVc.proof.proofValue.slice(1));
      proofValue.writeUInt8(0x0, 0);
      proofValue.writeUInt8(0x0, 1);
      modifiedVc.proof.proofValue = `u${base64url.encode(proofValue)}`;
      valuePrefix.get(keyType).set(vcVersion, modifiedVc);
    }
  }
  disclosed.invalid.valuePrefix = valuePrefix;
  return {
    base,
    disclosed
  };
}
