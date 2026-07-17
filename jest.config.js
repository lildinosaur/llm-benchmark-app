// Config Jest via next/jest : gère la transformation TS/TSX (SWC), le mapping
// CSS et l'environnement Next automatiquement.
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Charge next.config.js et les variables d'env depuis la racine du projet.
  dir: './'
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom']
};

module.exports = createJestConfig(customJestConfig);
