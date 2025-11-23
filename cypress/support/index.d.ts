/// <reference types="cypress" />
import 'cypress-axe';
import '@percy/cypress';

declare global {
  interface Window {
    grecaptcha?: any;
  }
}

declare global {
  namespace Cypress {
    interface Chainable {
      injectAxe(): Chainable<void>;
      checkA11y(...args: any[]): Chainable<void>;
      percySnapshot(name?: string, options?: any): Chainable<void>;
    }
  }
} 