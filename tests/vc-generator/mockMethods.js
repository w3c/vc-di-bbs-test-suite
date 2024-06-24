/*!
 * Copyright (c) 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as base64url from 'base64url-universal';
import * as cborg from 'cborg';
import {
  canonicalizeAndGroup,
  createHmac,
  hashCanonizedProof,
  hashMandatory,
} from '@digitalbazaar/di-sd-primitives';
import {createShuffledIdLabelMapFunction} from
  '../../node_modules/@digitalbazaar/bbs-2023-cryptosuite/lib/sdFunctions.js';

const TEXT_ENCODER = new TextEncoder();
const CBOR_PREFIX_BASE = new Uint8Array([0xd9, 0x5d, 0x02]);

export function stubProofValue({
  utfOffset = 0
} = {}) {
  return async function({verifyData, dataIntegrityProof}) {
    const {signer} = dataIntegrityProof;
    const {
      proofHash, mandatoryPointers, mandatoryHash, nonMandatory, hmacKey
    } = verifyData;
    // 1. Set BBS header to the concatenation of `proofHash` and
    // `mandatoryHash`.
    const bbsHeader = concatBuffers([proofHash, mandatoryHash]);

    // 2. Set BBS messages to all non-mandatory messages using
    // invalid UTF-8 encoding.
    const messages = nonMandatory.map(str => {
      return TEXT_ENCODER.encode(str).map(c => c + utfOffset);
    });
    // 3. Create BBS signature.
    const {publicKey} = signer;
    let bbsSignature;
    // use `multisign` if provided, otherwise use CBOR
    // to encode `data` for `sign`
    if(signer.multisign) {
      bbsSignature = await signer.multisign({
        header: bbsHeader, messages});
    } else {
      const data = cborg.encode([bbsHeader, messages]);
      bbsSignature = await signer.sign({data});
    }

    // 4. Generate `proofValue`.
    const proofValue = serializeBaseProofValue({
      bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers
    });
    return proofValue;
  };
}

export function stubVerifyData({
  // jsonld safeMode
  safe = true,
  // expected cryptosuite name
  name = 'bbs-2023',
  // should created by deleted?
  deleteCreated = true,
  // A key for the hmac
  hmacSeed = null
} = {}) {
  return async function createVerifyData({
    cryptosuite,
    document,
    proof,
    documentLoader
  }) {
    if(cryptosuite?.name !== name) {
      throw new TypeError(`"cryptosuite.name" must be "${name}".`);
    }
    if(!(cryptosuite.options && typeof cryptosuite.options === 'object')) {
      throw new TypeError(`"cryptosuite.options" must be an object.`);
    }
    const {mandatoryPointers = []} = cryptosuite.options;
    if(!Array.isArray(mandatoryPointers)) {
      throw new TypeError(
        `"cryptosuite.options.mandatoryPointers" must be an array.`);
    }

    // used for tests that need `created` to be in the proof
    if(deleteCreated) {
      // 0. Remove `created` from proof if present.
      // FIXME: implement `updateProof` or another method to ensure `created`
      // is not set once some API is exposed via `data-integrity`
      delete proof.created;
    }

    // 1. Generate `proofHash` in parallel.
    const options = {documentLoader, safe};
    const proofHashPromise = hashCanonizedProof({document, proof, options})
      .catch(e => e);

    // 2. Create HMAC label replacement function to randomize bnode labels.
    const hmac = await createHmac({key: hmacSeed});
    const labelMapFactoryFunction = createShuffledIdLabelMapFunction({hmac});

    // 3. Canonicalize document with randomized bnode labels and group N-Quads
    //  by mandatory pointers.
    const {
      groups: {mandatory: mandatoryGroup}
    } = await canonicalizeAndGroup({
      document,
      labelMapFactoryFunction,
      groups: {mandatory: mandatoryPointers},
      options
    });
    const mandatory = [...mandatoryGroup.matching.values()];
    const nonMandatory = [...mandatoryGroup.nonMatching.values()];

    // 4. Hash any mandatory N-Quads.
    const {mandatoryHash} = await hashMandatory({mandatory});

    // 5. Export HMAC key.
    const hmacKey = await hmac.export();

    // 6. Return data used by cryptosuite to sign.
    const proofHash = await proofHashPromise;
    if(proofHash instanceof Error) {
      throw proofHash;
    }
    return {proofHash, mandatoryPointers, mandatoryHash, nonMandatory, hmacKey};
  };
}

function serializeBaseProofValue({
  bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers
} = {}) {
  // NOTE: mocked version does not check params here
  // encode as multibase (base64url no pad) CBOR
  const payload = [
    // Uint8Array
    bbsSignature,
    // Uint8Array
    bbsHeader,
    // Uint8Array
    publicKey,
    // Uint8Array
    hmacKey,
    // array of strings
    mandatoryPointers
  ];
  const cbor = concatBuffers([
    CBOR_PREFIX_BASE, cborg.encode(payload, {useMaps: true})
  ]);
  return `u${base64url.encode(cbor)}`;
}

function concatBuffers(buffers) {
  const bytes = new Uint8Array(buffers.reduce((acc, b) => acc + b.length, 0));
  let offset = 0;
  for(const b of buffers) {
    bytes.set(b, offset);
    offset += b.length;
  }
  return bytes;
}

