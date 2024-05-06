/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {deriveCredential, verifyCredential} from './vc-generator/index.js';
import {getBs58Bytes, getBs64Bytes} from './helpers.js';
import {
  shouldBeBase64NoPadUrl,
  shouldBeBs58,
} from 'data-integrity-test-suite-assertion';
import chai from 'chai';
import {getMultikeys} from './vc-generator/key-gen.js';

const should = chai.should();

export const verificationFail = async ({credential, verifier}) => {
  const body = {
    verifiableCredential: credential,
    options: {
      checks: ['proof']
    }
  };
  const {result, error} = await verifier.post({json: body});
  should.not.exist(result, 'Expected no result from verifier.');
  should.exist(error, 'Expected verifier to error.');
  should.exist(error.status, 'Expected verifier to return an HTTP Status code');
  error.status.should.equal(
    400,
    'Expected HTTP Status code 400 invalid input!'
  );
};

export const verificationSuccess = async ({credential, verifier}) => {
  const body = {
    verifiableCredential: credential,
    options: {
      checks: ['proof']
    }
  };
  const {result, error} = await verifier.post({json: body});
  should.not.exist(error, 'Expected verifier to not error.');
  should.exist(result, 'Expected a result from verifier.');
  should.exist(result.status,
    'Expected verifier to return an HTTP Status code');
  result.status.should.equal(
    200,
    'Expected HTTP Status code 200.'
  );
};

export const checkEncoding = ({value, propertyName}) => {
  const [head] = value;
  if(head === 'z') {
    return shouldBeBs58(value.slice(1)).should.equal(
      true,
      `Expected "${propertyName}" to be bs58 encoded.`
    );
  }
  if(head === 'u') {
    return shouldBeBase64NoPadUrl(value.slice(1)).should.equal(
      true,
      `Expected "${propertyName}" to be bs64 url no pad encoded.`
    );
  }
  throw new Error(`Expected ${propertyName} to start with a multibase ` +
  `prefix. Received ${head}`);
};

export const shouldBeMultibaseEncoded = async ({
  expectedLength,
  prefixes = {
    multicodec: '',
    multibase: 'z'
  },
  decoder = getBs58Bytes,
  value,
  propertyName
}) => {
  value.should.be.a(
    'string',
    `Expected "${propertyName}" to be a string.`
  );
  // first value should match multibase prefix
  value[0]?.should.equal(
    prefixes.multibase,
    `Expected "${propertyName}" to start with "${prefixes.multibase}"`
  );
  checkEncoding({value, propertyName});
  const bytes = await decoder(value);
  if(typeof expectedLength === 'number') {
    bytes.length.should.equal(
      expectedLength,
      `Expected "${propertyName}" length to be ${expectedLength}`
    );
  }
  // compare the first two bytes to the expected multicodex prefix
  bytes.subarray(0, prefixes.multicodec.length).should.eql(
    prefixes.multicodec,
    `Expected "${propertyName}" to have multicodec prefix ` +
    `"0x${prefixes.multicodec.toString(16)}"`);
};

export const shouldBeProofValue = async proofValue => {
  should.exist(proofValue, 'Expected proofValue to exist.');
  await shouldBeMultibaseEncoded({
    prefixes: {
      multicodec: new Uint8Array([0xd9, 0x5d, 0x02]),
      multibase: 'u'
    },
    decoder: getBs64Bytes,
    value: proofValue,
    propertyName: 'proofValue'
  });
};

export const shouldVerifyDerivedProof = async ({
  verifiableCredential,
  selectivePointers = ['/credentialSubject/id'],
  keyTypes = ['P-381'],
  suite = 'bbs-2023'
}) => {
  const keys = await getMultikeys({keyTypes});
  for(const [keyType, {signer}] of keys) {
    const derivedVc = await deriveCredential({
      verifiableCredential,
      selectivePointers,
      suite,
      signer
    });
    should.exist(derivedVc, `Expected VC derived with keyType ${keyType} ` +
      `to exist.`);
    derivedVc.should.be.an('object', `Expected VC derived with keyType ` +
      `${keyType} to be an object.`);
    const verificationResult = await verifyCredential({
      credential: derivedVc,
      suite
    });
    should.exist(verificationResult, 'Expected verificationResult to exist.');
    verificationResult.should.be.an('object', 'Expected verificationResult ' +
      'to be an object.');
    should.not.exist(
      verificationResult.error,
      'Expected no verification error.'
    );
    should.exist(
      verificationResult.verified,
      'Expected "verificationResult.verified" to exist.'
    );
    verificationResult.verified.should.equal(
      true,
      'Expected "verificationResult.verified" to equal true.'
    );
  }
};
