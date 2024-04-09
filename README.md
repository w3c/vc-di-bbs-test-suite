<!--
Copyright 2024 Digital Bazaar, Inc.

SPDX-License-Identifier: BSD-3-Clause
-->

# [BBS](https://www.w3.org/TR/vc-di-bbs/) Cryptosuite test suite

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
  - [Testing Locally](#testing-locally)
- [Implementation](#implementation)
  - [Docker Integration (TODO)](#docker-integration-todo)
- [Contribute](#contribute)
- [License](#license)

## Background
Provides interoperability tests for verifiable credential processors
(issuers and verifiers) that support [BBS](https://www.w3.org/TR/vc-di-bbs/)
[Data Integrity](https://www.w3.org/TR/vc-data-integrity/) cryptosuites.

## Install

```sh
npm i
```

## Usage

```sh
npm test
```

### Testing Locally

To test a single implementation or endpoint running locally, you can
copy `localConfig.example.cjs` to `localConfig.cjs`
in the root directory of the test suite.

```bash
cp localConfig.example.cjs localConfig.cjs
```

This file must be a CommonJS module that exports an object containing a
`settings` object (for configuring the test suite code itself) and an
`implementations` array (for configuring the implementation(s) to test against).

The format of the object contained in the `implementations` array is
identical to the one defined in
[VC Test Suite Implementations](https://github.com/w3c/vc-test-suite-implementations?tab=readme-ov-file#usage)).
The `implementations` array may contain more than one implementation object, to
test multiple implementations in one run.

```js
// .localConfig.cjs defining local implementations
// you can specify a BASE_URL before running the tests such as:
// BASE_URL=http://localhost:40443/zDdfsdfs npm test
const baseUrl = process.env.BASE_URL || 'https://localhost:40443/id';
module.exports = {
  settings: {
    enableInteropTests: false, // default
    testAllImplementations: false // default
  },
  implementations: [{
    name: 'My Company',
    implementation: 'My Implementation Name',
    // only this implementation will be run in the suite
    issuers: [{
      id: 'did:key:zMyKey',
      endpoint: `${baseUrl}/credentials/issue`,
      tags: ['bbs-2023']
    }],
    verifiers: [{
      endpoint: `${baseUrl}/credentials/verify`,
      tags: ['bbs-2023']
    }]
  }];
```

## Implementation

You will need an issuer and verifier that are compatible with [VC API](https://w3c-ccg.github.io/vc-api/)
and are capable of handling issuance and verification of Verifiable Credentials
with `DataIntegrityProof` proof type using the `bbs-2023` cryptosuite.

To add your implementation to this test suite, you will need to add 2 endpoints
to your implementation manifest.
- A credential issuer endpoint (`/credentials/issue`) in the `issuers` property.
- A credential verifier endpoint (`/credentials/verify`) in the `verifiers` property.

All endpoints will require a cryptosuite tag of `bbs-2023`.

A simplified manifest would look like this:

```json
{
  "name": "My Company",
  "implementation": "My implementation",
  "issuers": [{
    "id": "",
    "endpoint": "https://mycompany.example/credentials/issue",
    "tags": ["bbs-2023"]
  }],
  "verifiers": [{
    "id": "",
    "endpoint": "https://mycompany.example/credentials/verify",
    "tags": ["bbs-2023"]
  }]
}
```

The example above represents an unauthenticated endpoint. You may add ZCAP or
OAuth2 authentication to your endpoints. You can find an example in the
[vc-test-suite-implementations README](https://github.com/w3c-ccg/vc-test-suite-implementations#adding-a-new-implementation).

To run the tests, some implementations may require client secrets that can be
passed as environment variables to the test script. To see which implementations
require client secrets, please check the implementation manifest within the
[vc-test-suite-implementations](https://github.com/w3c-ccg/vc-test-suite-implementations/tree/main/implementations) library.

### Docker Integration (TODO)

We are presently working on implementing a new feature that will enable the
use of Docker images instead of live endpoints. The Docker image that
you provide will be started when the test suite is run. The image is expected
to expose the API provided above, which will be used in the same way that
live HTTP endpoints are used above.

## Contribute

See [the CONTRIBUTING.md file](CONTRIBUTING.md).

Pull Requests are welcome!

## License

See [the LICENSE file](LICENSE)
