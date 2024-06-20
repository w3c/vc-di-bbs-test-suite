import * as cborg from 'cborg';
import {concatBuffers, serializeBaseProofValue} from
  '../../node_modules/@digitalbazaar/bbs-2023-cryptosuite/lib/proofValue.js';

const TEXT_ENCODER = new TextEncoder();

export async function createProofValue({verifyData, dataIntegrityProof}) {
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
    return TEXT_ENCODER.encode(str).map(c => c + 1);
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
}
