'use strict';

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file. (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * If you need to pick up file changes, run `pnpm install` again. It will prompt you
 * to run setup.
 */
module.exports = {
  hooks: {
    readPackage(pkg, context) {
      if (pkg.devDependencies && pkg.devDependencies.typescript) {
        pkg.devDependencies.typescript = '^5.5.0';
      }
      if (pkg.devDependencies && pkg.devDependencies['@typescript-eslint/eslint-plugin']) {
        pkg.devDependencies['@typescript-eslint/eslint-plugin'] = '^8.46.1';
      }
      if (pkg.devDependencies && pkg.devDependencies['@typescript-eslint/parser']) {
        pkg.devDependencies['@typescript-eslint/parser'] = '^8.46.1';
      }
      if (pkg.devDependencies && pkg.devDependencies.eslint) {
        pkg.devDependencies.eslint = '^8.57.1';
      }
      return pkg;
    },
  },
  resolutionMode: "highest",
};
