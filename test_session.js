// Script temporaire pour créer une session de test
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Générer un token de session temporaire pour l'utilisateur admin (id: 1)
const sessionToken = jwt.sign(
  { userId: 1 },
  'test-secret-key',
  { expiresIn: '1h' }
);

console.log('Session token:', sessionToken);

// Test des données de vote pour salarié
const testData = {
  userRole: 'Salarié·es SCC',
  canVoteForCompanies: true,
  votableCompanies: [
    {
      id: 1,
      name: 'Coopérative Beta',
      type: 'present',
      representativeId: 2,
      representativeName: 'Christine Nissim'
    },
    {
      id: 3,
      name: 'Société Coopérative de Construction SCC',
      type: 'proxy',
      representativeId: 3,
      representativeName: 'Salarié Test'
    }
  ]
};

console.log('Test data:', JSON.stringify(testData, null, 2));