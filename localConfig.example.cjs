// Rename this file to localConfig.cjs
// you can specify a BASE_URL before running the tests such as:
// BASE_URL=http://localhost:40443/zDdfsdfs npm test
const baseUrl = process.env.BASE_URL || 'https://localhost:40443/id';
module.exports = {
  settings: {},
  implementations: [{
    name: 'My Company',
    implementation: 'My Implementation Name',
    issuers: [{
      id: 'did:myMethod:implementation:issuer:id',
      endpoint: `${baseUrl}/credentials/issue`,
      tags: ['bbs-2023']
    }],
    verifiers: [{
      id: 'did:myMethod:implementation:verifier:id',
      endpoint: `${baseUrl}/credentials/verify`,
      tags: ['bbs-2023']
    }]
  }]
};
