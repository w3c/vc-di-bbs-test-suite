/*!
 * Copyright 2023 Digital Bazaar, Inc. All Rights Reserved
 */
import * as didMethodKey from '@digitalbazaar/did-method-key';

const didKeyDriver = didMethodKey.driver();

export async function didResolver({url}) {
  if(url.startsWith('did:')) {
    return didKeyDriver.get({did: url});
  }
  throw new Error('DID Method not supported by resolver');
}
