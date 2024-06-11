/*
 * Copyright 2023 - 2024 Digital Bazaar, Inc.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as bs58 from 'base58-universal';
import * as bs64 from 'base64url-universal';
import {createRequire} from 'node:module';
import {klona} from 'klona';
import {v4 as uuidv4} from 'uuid';

// remove first element and decode
export const getBs58Bytes = async s => bs58.decode(s.slice(1));
export const getBs64Bytes = async s => bs64.decode(s.slice(1));
export const require = createRequire(import.meta.url);

// Javascript's default ISO timestamp contains milliseconds.
// This lops off the MS part of the UTC RFC3339 TimeStamp and replaces
// it with a terminal Z.
export const ISOTimeStamp = ({date = new Date()} = {}) => {
  return date.toISOString().replace(/\.\d+Z$/, 'Z');
};

export const supportsVc = ({vcVersion, endpoint}) => {
  const {
    // assume support for VC 2.0 for bbs
    supports = {vc: ['2.0']}
  } = endpoint?.settings;
  return supports.vc.includes(vcVersion);
};

/**
 * Filters Verifiers for the Data Integrity Verifier tests.
 * Needs to have tags and vcVersion bound to it.
 *
 * @param {object} options - Options to use.
 * @param {object} options.implementation - An implementation.
 *
 * @returns {Array<object>} Filtered endpoints.
 */
export function filterVerifiers({implementation}) {
  const endpoints = implementation.verifiers;
  return endpoints.filter(endpoint => {
    // this.tags must be supplied via bind
    if(this.tags.every(tag => endpoint.tags.has(tag))) {
      // this.vcVerson must be supplied via bind
      return supportsVc({vcVersion: this.vcVersion, endpoint});
    }
    return false;
  });
}

export const createInitialVc = async ({
  issuer,
  vc,
  mandatoryPointers,
  addIssuanceDate = true
}) => {
  const {settings: {id: issuerId, options = {}}} = issuer;
  const testOptions = klona(options);
  const credential = klona(vc);
  credential.id = `urn:uuid:${uuidv4()}`;
  credential.issuer = issuerId;
  if(addIssuanceDate) {
    credential.issuanceDate = ISOTimeStamp();
  }
  testOptions.mandatoryPointers = mandatoryPointers;
  const body = {credential, options: testOptions};
  const {data} = await issuer.post({json: body});
  return data;
};

export const createDisclosedVc = async ({
  selectivePointers = [], signedCredential, vcHolder
}) => {
  const {result, data, error} = await vcHolder.post({
    json: {
      options: {
        selectivePointers
      },
      verifiableCredential: signedCredential
    }
  });
  if(!result || !result.ok) {
    console.warn(
      `Failed to derive VC ${(result || error)?.requestUrl}`,
      error,
      JSON.stringify({data, signedCredential}, null, 2));
  }
  return {disclosedCredential: data};
};
