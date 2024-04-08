/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getBs58Bytes, getMulticodecPrefix} from './helpers.js';
import chai from 'chai';

const should = chai.should();

// RegExp with bs58 characters in it
const bs58 =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
// assert something is entirely bs58 encoded
export const shouldBeBs58 = s => bs58.test(s);

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
  // z is the bs58 multibase prefix
  if(prefixes.multibase === 'z') {
    shouldBeBs58(value.slice(1)).should.equal(
      true,
      `Expected "${propertyName}" to be bs58 encoded.`);
  }
  const bytes = await decoder(value);
  bytes.length.should.equal(
    expectedLength,
    `Expected "${propertyName}" length to be ${expectedLength}`
  );
  const startingBytes = await getMulticodecPrefix(prefixes.multicodec);
  // compare the first two bytes to the expected multicodex prefix
  bytes.subarray(0, 2).should.eql(
    new Uint8Array(startingBytes),
    `Expected "${propertyName}" to have multicodec prefix ` +
    `"0x${prefixes.multicodec.toString(16)}"`);
};
