/*!
 * Copyright (c) 2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as base64url from 'base64url-universal';
import * as Bls12381Multikey from '@digitalbazaar/bls12-381-multikey';
import * as cborg from 'cborg';
import {
  canonicalize,
  canonicalizeAndGroup,
  createHmac,
  hashCanonizedProof,
  hashMandatory,
  selectJsonLd,
  stripBlankNodePrefixes,
} from '@digitalbazaar/di-sd-primitives';
import {createShuffledIdLabelMapFunction} from
  '../../node_modules/@digitalbazaar/bbs-2023-cryptosuite/lib/sdFunctions.js';

const TEXT_ENCODER = new TextEncoder();
const CBOR_PREFIX_BASE = new Uint8Array([0xd9, 0x5d, 0x02]);
const CBOR_PREFIX_DERIVED = new Uint8Array([0xd9, 0x5d, 0x03]);

// CBOR decoder for implementations that use tag 64 for Uint8Array instead
// of byte string major type 2
const TAGS = [];
TAGS[64] = bytes => bytes;

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
    const messages = nonMandatory.map(
      str => stringToUtf8Bytes({str, utfOffset}));
    // 3. Create BBS signature.
    const {publicKey} = signer;
    let bbsSignature;
    // encode `data` for `sign` using `multisign` if provided;
    // otherwise, using CBOR
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
  // should created be deleted?
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

export function stubDisclosureData({
  name = 'bbs-2023',
  utfOffset = 0
}) {
  return async function({
    cryptosuite, document, proof, documentLoader
  }) {
    if(cryptosuite?.name !== name) {
      throw new TypeError(`"cryptosuite.name" must be "${name}".`);
    }
    if(!(cryptosuite.options && typeof cryptosuite.options === 'object')) {
      throw new TypeError(`"cryptosuite.options" must be an object.`);
    }
    if(!(cryptosuite.options.presentationHeader instanceof Uint8Array)) {
      throw new TypeError(
        '"cryptosuite.options.presentationHeader" must be a Uint8Array.');
    }

    // 1. Parse base `proof` to get parameters for disclosure proof.
    const {
      bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers
    } = await parseBaseProofValue({proof});

    // 2. Ensure mandatory and/or selective data will be disclosed.
    const {selectivePointers = []} = cryptosuite.options;
    if(!(mandatoryPointers?.length > 0 || selectivePointers?.length > 0)) {
      throw new Error('Nothing selected for disclosure.');
    }

    // 3. Create HMAC label replacement function from `hmacKey` to randomize
    //   bnode identifiers.
    const hmac = await createHmac({key: hmacKey});
    const labelMapFactoryFunction = createShuffledIdLabelMapFunction({hmac});

    // 4. Canonicalize document with randomized bnode labels and group N-Quads
    //  by mandatory, selective, and combined pointers.
    const options = {documentLoader};
    const combinedPointers = mandatoryPointers.concat(selectivePointers);
    const {
      groups: {
        mandatory: mandatoryGroup,
        selective: selectiveGroup,
        combined: combinedGroup,
      },
      labelMap
    } = await canonicalizeAndGroup({
      document,
      labelMapFactoryFunction,
      groups: {
        mandatory: mandatoryPointers,
        selective: selectivePointers,
        combined: combinedPointers
      },
      options
    });

    // 5. Convert absolute indexes of mandatory N-Quads to indexes relative to
    // the combined output to be revealed.
    let relativeIndex = 0;
    const mandatoryIndexes = [];
    for(const absoluteIndex of combinedGroup.matching.keys()) {
      if(mandatoryGroup.matching.has(absoluteIndex)) {
        mandatoryIndexes.push(relativeIndex);
      }
      relativeIndex++;
    }

    // 6. Convert absolute indexes of selective N-Quads to indexes relative to
    // the non-mandatory messages, as these are the indexes used in BBS.
    relativeIndex = 0;
    const selectiveIndexes = [];
    for(const absoluteIndex of mandatoryGroup.nonMatching.keys()) {
      if(selectiveGroup.matching.has(absoluteIndex)) {
        selectiveIndexes.push(relativeIndex);
      }
      relativeIndex++;
    }

    // 7. Set `bbsMessages` to an array with the UTF-8 encoding of each
    // non-mandatory message.
    const bbsMessages = [...mandatoryGroup.nonMatching.values()].map(
      str => stringToUtf8Bytes({str, utfOffset}));

    // 8. Produce reveal document using combination of mandatory and selective
    //   pointers.
    const revealDoc = selectJsonLd({document, pointers: combinedPointers});

    // 9. Canonicalize deskolemized N-Quads for the combined group to generate
    //   the canonical blank node labels a verifier will see.
    let canonicalIdMap = new Map();
    await canonicalize(
      combinedGroup.deskolemizedNQuads.join(''),
      {...options, inputFormat: 'application/n-quads', canonicalIdMap});
    // implementation-specific bnode prefix fix
    canonicalIdMap = stripBlankNodePrefixes(canonicalIdMap);

    // 10. Produce a blank node label map from the canonical blank node labels
    //   the verifier will see to the HMAC labels.
    const verifierLabelMap = new Map();
    for(const [inputLabel, verifierLabel] of canonicalIdMap) {
      verifierLabelMap.set(verifierLabel, labelMap.get(inputLabel));
    }

    // 11. Generate BBS proof.
    const importedKey = await Bls12381Multikey.fromRaw({
      algorithm: Bls12381Multikey.ALGORITHMS.BBS_BLS12381_SHA256, publicKey
    });
    const {presentationHeader} = cryptosuite.options;
    const bbsProof = await importedKey.deriveProof({
      signature: bbsSignature, header: bbsHeader, messages: bbsMessages,
      presentationHeader, disclosedMessageIndexes: selectiveIndexes
    });

    // 12. Return data used by cryptosuite to disclose.
    return {
      bbsProof, labelMap: verifierLabelMap,
      mandatoryIndexes, selectiveIndexes, presentationHeader,
      revealDoc
    };
  };
}

export function parseBaseProofValue({proof} = {}) {
  try {
    if(typeof proof?.proofValue !== 'string') {
      throw new TypeError('"proof.proofValue" must be a string.');
    }
    if(proof.proofValue[0] !== 'u') {
      throw new Error('Only base64url multibase encoding is supported.');
    }

    // decode from base64url
    const proofValue = base64url.decode(proof.proofValue.slice(1));
    // NOTE: skipped pase proof prefix check

    const payload = proofValue.subarray(CBOR_PREFIX_BASE.length);
    const [
      bbsSignature,
      bbsHeader,
      publicKey,
      hmacKey,
      mandatoryPointers
    ] = cborg.decode(payload, {useMaps: true, tags: TAGS});

    const params = {
      bbsSignature, bbsHeader, publicKey, hmacKey, mandatoryPointers
    };
    // NOTE: params validation skipped
    return params;
  } catch(e) {
    const err = new TypeError(
      'The proof does not include a valid "proofValue" property.');
    err.cause = e;
    throw err;
  }
}

export function stubDerive({
  name,
  utfOffset
} = {}) {
  const createDisclosureData = stubDisclosureData({utfOffset, name});
  return async function({
    cryptosuite, document, purpose, proofSet,
    documentLoader, dataIntegrityProof
  }) {
  // find matching base `proof` in `proofSet`
    const {options: {proofId}} = cryptosuite;
    const baseProof = await _findProof({proofId, proofSet, dataIntegrityProof});

    // ensure `purpose` matches `baseProof`
    if(baseProof.proofPurpose !== purpose.term) {
      throw new Error(
        'Base proof purpose does not match purpose for derived proof.');
    }

    // generate data for disclosure
    const {
      bbsProof, labelMap,
      mandatoryIndexes, selectiveIndexes, presentationHeader,
      revealDoc
    } = await createDisclosureData(
      {cryptosuite, document, proof: baseProof, documentLoader});

    // create new disclosure proof
    const newProof = {...baseProof};
    newProof.proofValue = await serializeDisclosureProofValue({
      bbsProof, labelMap, mandatoryIndexes, selectiveIndexes,
      presentationHeader
    });

    // attach proof to reveal doc w/o context
    delete newProof['@context'];
    revealDoc.proof = newProof;
    return revealDoc;
  };
}

function serializeDisclosureProofValue({
  bbsProof, labelMap, mandatoryIndexes, selectiveIndexes, presentationHeader
} = {}) {
  // NOTE: validator is skipped here

  // encode as multibase (base64url no pad) CBOR
  const payload = [
    // Uint8Array
    bbsProof,
    // Map of strings => strings compressed to ints => Uint8Arrays
    _compressLabelMap(labelMap),
    // array of numbers
    mandatoryIndexes,
    // array of numbers
    selectiveIndexes,
    // Uint8Array
    presentationHeader
  ];
  const cbor = concatBuffers([
    CBOR_PREFIX_DERIVED, cborg.encode(payload, {useMaps: true})
  ]);
  return `u${base64url.encode(cbor)}`;
}

function _compressLabelMap(labelMap) {
  const map = new Map();
  for(const [k, v] of labelMap.entries()) {
    map.set(parseInt(k.slice(4), 10), parseInt(v.slice(1), 10));
  }
  return map;
}

async function _findProof({proofId, proofSet, dataIntegrityProof}) {
  let proof;
  if(proofId) {
    proof = proofSet.find(p => p.id === proofId);
  } else {
    // no `proofId` given, so see if a single matching proof exists
    for(const p of proofSet) {
      if(await dataIntegrityProof.matchProof({proof: p})) {
        if(proof) {
          // already matched
          throw new Error(
            'Multiple matching proofs; a "proofId" must be specified.');
        }
        proof = p;
      }
    }
  }
  if(!proof) {
    throw new Error(
      'No matching base proof found from which to derive a disclosure proof.');
  }
  return proof;
}

// converts a string to a Uint8Array and then adds an
// offset to produce an optional invalid encoding
export function stringToUtf8Bytes({str, utfOffset = 0}) {
  return TEXT_ENCODER.encode(str).map(b => b + utfOffset);
}
