/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {
  contexts as credentialsContexts
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

/*
const _dataIntegrityCtx = structuredClone(dataIntegrityCtx.CONTEXT);
const diCtx = _dataIntegrityCtx['@context'];
// add UnknownProofType to local context for test data
diCtx.UnknownProofType =
  structuredClone(_dataIntegrityCtx['@context'].DataIntegrityProof);
// add invalidPurpose to context for test data
diCtx.DataIntegrityProof['@context'].proofPurpose['@context'].invalidPurpose = {
  '@id': 'https://w3id.org/security#invalidPurpose',
  '@type': '@id',
  '@container': '@set'
};
contextMap.set(
  dataIntegrityCtx.constants.CONTEXT_URL,
  _dataIntegrityCtx
);
*/

// add contexts for the documentLoader
contextMap.set(multikeyCtx.constants.CONTEXT_URL, multikeyCtx.CONTEXT);

// add the data integrity contexts
setContexts(dataIntegrityCtx.contexts);
// add the dids contexts
setContexts(didCtx.contexts);

export {contextMap};
