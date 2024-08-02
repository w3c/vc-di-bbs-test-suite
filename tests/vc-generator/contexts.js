/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  contexts as credentialsContexts,
  named as namedCredentialsContexts
} from '@digitalbazaar/credentials-context';
import dataIntegrityCtx from '@digitalbazaar/data-integrity-context';
import didCtx from '@digitalcredentials/did-context';
import multikeyCtx from '@digitalbazaar/multikey-context';

const contextMap = new Map(credentialsContexts);
const setContexts = contexts => {
  for(const [key, value] of contexts) {
    contextMap.set(key, structuredClone(value));
  }
};

const {context: vc2Context} = namedCredentialsContexts.get('v2');
const v2Ctx = vc2Context['@context'];
v2Ctx.UnknownProofType = structuredClone(v2Ctx.DataIntegrityProof);
const _dataIntegrityCtx = structuredClone(dataIntegrityCtx.CONTEXT);
const diCtx = _dataIntegrityCtx['@context'];
diCtx.UnknownProofType = structuredClone(diCtx.DataIntegrityProof);
contextMap.set(
  dataIntegrityCtx.constants.CONTEXT_URL,
  _dataIntegrityCtx
);
// add contexts for the documentLoader
contextMap.set(multikeyCtx.constants.CONTEXT_URL, multikeyCtx.CONTEXT);

// add the dids contexts
setContexts(didCtx.contexts);

export {contextMap};
