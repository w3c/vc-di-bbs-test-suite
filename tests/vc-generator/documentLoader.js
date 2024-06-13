/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as Bls12381Multikey from '@digitalbazaar/bls12-381-multikey';
import * as didKey from '@digitalbazaar/did-method-key';
import {contextMap} from './contexts.js';
/*
 * FIXME reenable documentLoader on release of jsonld 9
import {JsonLdDocumentLoader} from 'jsonld-document-loader';

const jdl = new JsonLdDocumentLoader();

// add contexts to documentLoad
for(const [key, value] of contextMap) {
  jdl.addStatic(key, value);
}
*/

const _documentLoader = url => {
  const document = contextMap.get(url);
  return {
    contextUrl: null,
    documentUrl: url,
    document
  };
};

const driver = didKey.driver();

const keyTypes = [
  {keyType: 'P-381', header: 'zUC7', fromMultibase: Bls12381Multikey.from}
];

for(const {header, fromMultibase} of keyTypes) {
  driver.use({
    multibaseMultikeyHeader: header,
    fromMultibase
  });
}

export const documentLoader = async url => {
  if(url.startsWith('did:')) {
    const document = await driver.get({did: url});
    return {
      contextUrl: null,
      documentUrl: url,
      document
    };
  }
  return _documentLoader(url);
};
