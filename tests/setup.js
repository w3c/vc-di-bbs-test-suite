/*!
 * Copyright 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  deriveCredentials,
  getMultikeys,
  issueCredentials
} from './vc-generator/index.js';
import {generators} from 'data-integrity-test-suite-assertion';

export async function verifySetup({credentials, keyTypes, suite}) {
  const testVectors = {
    //signedCredentials
    signed: new Map(),
    disclosed: {
      //disclosedCredentials
      base: new Map(),
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
        cryptosuite: new Map()
      }
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

  // create initial signed VCs
  testVectors.signed = await issueCredentials({
    credentials: Object.entries(subjectNestedObjects),
    suite,
    keyTypes
  });
  const disclosedBaseVectors = transformVectors(
    subjectNestedObjects,
    vector => {
      vector.selectivePointers = ['/credentialSubject/id'];
      return vector;
    });
  // use initial VCs for a basic selective disclosure test
  testVectors.disclosed.base = await deriveCredentials({
    vectors: disclosedBaseVectors,
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
  testVectors.disclosed.nested = await deriveCredentials({
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
  testVectors.disclosed.noIds = await deriveCredentials({
    vectors: disclosedNoIdVectors,
    keys,
    suiteName: suite
  });
  // select full arrays
  testVectors.disclosed.array.full = await deriveCredentials({
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
  testVectors.disclosed.array.lessThanFull = await deriveCredentials({
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
  testVectors.disclosed.array.missingElements = await deriveCredentials({
    vectors: removeFirst7Vectors,
    suiteName: suite,
    keys
  });
  const {mandatory, shared} = generators;
  const {invalidProofType} = mandatory;
  const {invalidCryptosuite} = shared;
  testVectors.disclosed.invalid.proofTypeAndCryptosuite =
    await deriveCredentials({
      keys,
      vectors: transformVectors(subjectNestedObjects),
      suiteName: suite,
      generators: [invalidProofType, invalidCryptosuite]
    });
  testVectors.disclosed.invalid.cryptosuite = await deriveCredentials({
    keys,
    vectors: transformVectors(subjectNestedObjects),
    suiteName: suite,
    generators: [invalidCryptosuite]
  });
  return testVectors;
}
