/*!
 * Copyright 2023-2024 Digital Bazaar, Inc.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import * as bbs2023Cryptosuite from '@digitalbazaar/bbs-2023-cryptosuite';
import {DataIntegrityProof} from '@digitalbazaar/data-integrity';

export const getSuite = ({
  suite,
  signer,
  mandatoryPointers,
  selectivePointers,
  verify
}) => {
  switch(suite) {
    case `bbs-2023`: {
      if(mandatoryPointers) {
        return new DataIntegrityProof({
          signer,
          cryptosuite: bbs2023Cryptosuite.createSignCryptosuite({
            mandatoryPointers
          })
        });
      }
      if(selectivePointers) {
        return new DataIntegrityProof({
          signer,
          cryptosuite: bbs2023Cryptosuite.createDiscloseCryptosuite({
            selectivePointers
          })
        });
      }
      if(verify) {
        return new DataIntegrityProof({
          cryptosuite: bbs2023Cryptosuite.createVerifyCryptosuite()
        });
      }
      throw new Error('Suite "ecdsa-sd-2023" requires either mandatory or ' +
        'selective pointers');
    }
    default:
      throw new Error(`Unsupported cryptosuite suite: ${suite}`);
  }
};
