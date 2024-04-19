/*!
 * Copyright 2023 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as bbs2023Cryptosuite from '@digitalbazaar/bbs-2023-cryptosuite';

export const getSuite = ({suite, mandatoryPointers, selectivePointers}) => {
  switch(suite) {
    case `bbs-2023`: {
      if(mandatoryPointers) {
        return bbs2023Cryptosuite.createSignCryptosuite({
          mandatoryPointers
        });
      }
      if(selectivePointers) {
        return bbs2023Cryptosuite.createDiscloseCryptosuite({
          selectivePointers
        });
      }
      throw new Error('Suite "ecdsa-sd-2023" requires either mandatory or ' +
        'selective pointers');
    }
    default:
      throw new Error(`Unsupported cryptosuite suite: ${suite}`);
  }
};
