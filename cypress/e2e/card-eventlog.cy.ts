/// <reference types="cypress" />
import 'cypress-axe';

describe('CardEventLog E2E', () => {
  beforeEach(() => {
    cy.visit('/card-demo');
    cy.injectAxe();
  });

  it('should allow pinning and unpinning events', () => {
    cy.get('[aria-label^="Pin event"], [aria-label^="Unpin event"]').first().click();
    cy.get('[aria-label^="Unpin event"]').should('exist');
    cy.get('[aria-label^="Unpin event"]').first().click();
    cy.get('[aria-label^="Pin event"]').should('exist');
  });

  it('should allow batch selecting and exporting events', () => {
    cy.get('[aria-label="Select all events"]').click();
    cy.get('[aria-label="Export selected"]').click();
    // TODO: assert export modal or file
  });

  it('should open share modal and copy link', () => {
    cy.get('[aria-label="Share event"]').first().click();
    cy.get('input[aria-label="Share link"]').should('exist');
    cy.get('button[aria-label="Copy link"]').click();
    cy.contains('Copied!').should('exist');
  });

  it('should show confetti on export', () => {
    cy.get('[aria-label="Export event"]').first().click();
    cy.get('[aria-label="Confetti burst"]').should('exist');
  });

  it('should be accessible (axe)', () => {
    cy.checkA11y();
  });

  it('should match visual snapshot', () => {
    cy.percySnapshot('CardEventLog');
  });
}); 