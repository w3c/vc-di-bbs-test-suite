/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  contexts as credentialsContexts,
  named as namedCredentialsContexts
} from '@digitalbazaar/credentials-context';
import {
  CONTEXT as vdlCtx,
  CONTEXT_URL as vdlCtxUrl
} from '@digitalbazaar/vdl-context';
import dataIntegrityCtx from '@digitalbazaar/data-integrity-context';
import didCtx from '@digitalcredentials/did-context';
import multikeyCtx from '@digitalbazaar/multikey-context';

const contextMap = new Map();
const setContexts = contexts => {
  for(const [key, value] of contexts) {
    contextMap.set(key, structuredClone(value));
  }
};
const invalidPurpose = {
  '@id': 'https://w3id.org/security#invalidPurpose',
  '@type': '@id',
  '@container': '@set'
};

// adding terms manually
const {
  id: v2ContextUrl,
  context: v2Context
} = structuredClone(namedCredentialsContexts.get('v2'));
const v2Ctx = v2Context['@context'];
v2Ctx.UnknownProofType = structuredClone(v2Ctx.DataIntegrityProof);
v2Ctx.DataIntegrityProof['@context'].proofPurpose['@context'].invalidPurpose =
  invalidPurpose;
v2Ctx.undefinedTerm = 'urn:example:undefinedTerm';

const _dataIntegrityCtx = structuredClone(dataIntegrityCtx.CONTEXT);
const diCtx = _dataIntegrityCtx['@context'];
diCtx.UnknownProofType = structuredClone(diCtx.DataIntegrityProof);
diCtx.DataIntegrityProof['@context'].proofPurpose['@context'].invalidPurpose =
  invalidPurpose;
diCtx.undefinedTerm = 'urn:example:undefinedTerm';

// adding to contextMap
setContexts(didCtx.contexts);
setContexts(credentialsContexts);
contextMap.set(multikeyCtx.constants.CONTEXT_URL, multikeyCtx.CONTEXT);
contextMap.set(vdlCtxUrl, vdlCtx);
contextMap.set(dataIntegrityCtx.constants.CONTEXT_URL, _dataIntegrityCtx);
contextMap.set(v2ContextUrl, v2Context);

export {contextMap};
