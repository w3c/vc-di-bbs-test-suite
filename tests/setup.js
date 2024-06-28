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
    //nestedDisclosedCredentials
    nested: new Map(),
    //disclosedDlCredentialNoIds
    noIds: new Map(),
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
  const disclosedNestedVectors = transformVectors(
    subjectNestedObjects,
    vector => {
      vector.selectivePointers = vector.selectivePointers.slice(1, 3);
      return vector;
    }
  );
  // create initial nestedDisclosedCredential from signedVc
  disclosed.nested = await deriveCredentials({
    vectors: disclosedNestedVectors,
    suiteName: suite,
    keys
  });
  const disclosedNoIdVectors = transformVectors(
    subjectNestedObjects,
    vector => {
      // delete the vc id
      delete vector.credential.id;
      // no idea why, but we reduce the pointers to?
      vector.selectivePointers = vector.selectivePointers.slice(1, 3);
      return vector;
    }
  );
  disclosed.noIds = await deriveCredentials({
    vectors: disclosedNoIdVectors,
    keys,
    suiteName: suite
  });
  // select full arrays
  disclosed.array.full = await deriveCredentials({
    vectors: transformVectors(subjectHasArrays),
    suiteName: suite,
    keys
  });
  const lessThanFullVectors = transformVectors(
    subjectHasArrays,
    vector => {
      // select less than full subarrays
      vector.selectivePointers = vector.selectivePointers.slice(2, -4);
      return vector;
    }
  );
  disclosed.array.lessThanFull = await deriveCredentials({
    vectors: lessThanFullVectors,
    suiteName: suite,
    keys
  });
  const removeFirst7Vectors = transformVectors(
    subjectHasArrays,
    vector => {
      // select w/o first 7 array element
      vector.selectivePointers = vector.selectivePointers.slice(7);
      return vector;
    }
  );
  disclosed.array.missingElements = await deriveCredentials({
    vectors: removeFirst7Vectors,
    suiteName: suite,
    keys
  });
  const {mandatory, created} = generators;
  const {invalidCreated} = created;
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
  disclosed.invalid.cborg = await deriveCredentials({
    keys,
    vectors: disclosedBasicVectors,
    suiteName: suite,
    generators: [invalidCborEncoding]
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
  disclosed.invalid.created = await deriveCredentials({
    keys,
    vectors: transformVectors(subjectNestedObjects),
    suiteName: suite,
    generators: [invalidCreated, passCreated]
  });
  return {
    base,
    disclosed
  };
}
