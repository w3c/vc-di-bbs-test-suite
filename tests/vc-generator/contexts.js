/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import credentialsCtx from 'credentials-context';
import * as credentialsV2Ctx from '@digitalbazaar/credentials-v2-context';
import dataIntegrityCtx from '@digitalbazaar/data-integrity-context';
import didCtx from '@digitalcredentials/did-context';
import {klona} from 'klona';
import multikeyCtx from '@digitalbazaar/multikey-context';

const contextMap = new Map();

const _dataIntegrityCtx = klona(dataIntegrityCtx.CONTEXT);
const diCtx = _dataIntegrityCtx['@context'];
// add UnknownProofType to local context for test data
diCtx.UnknownProofType =
  klona(_dataIntegrityCtx['@context'].DataIntegrityProof);
// add invalidPurpose to context for test data
diCtx.DataIntegrityProof['@context'].proofPurpose['@context'].invalidPurpose = {
  '@id': 'https://w3id.org/security#invalidPurpose',
  '@type': '@id',
  '@container': '@set'
};

// add contexts for the documentLoader
contextMap.set(multikeyCtx.constants.CONTEXT_URL, multikeyCtx.CONTEXT);
contextMap.set(
  dataIntegrityCtx.constants.CONTEXT_URL,
  _dataIntegrityCtx
);

const setContexts = contexts => {
  for(const [key, value] of contexts) {
    contextMap.set(key, value);
  }
};
// add the dids contexts
setContexts(didCtx.contexts);
// add the credentials v1 contexts
setContexts(credentialsCtx.contexts);
// add the credentials v2 contexts
setContexts(credentialsV2Ctx.contexts);

export {contextMap};
