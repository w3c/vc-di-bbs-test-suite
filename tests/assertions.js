/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

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
