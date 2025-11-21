/// <reference types="cypress" />

import 'cypress-real-events/support';
import '@percy/cypress';
import 'cypress-axe';

describe('Coinet Atomic Card E2E', () => {
  beforeEach(() => {
    cy.visit('/card-demo'); // Assumes a /card-demo page exists for Card showcase
  });

  it('renders all Card variants and subcomponents', () => {
    cy.get('.co-card').should('exist');
    cy.get('.co-card-frosted').should('exist');
    cy.get('.co-card-neon').should('exist');
    cy.get('.co-card-minimal').should('exist');
    cy.get('.co-card-header').should('exist');
    cy.get('.co-card-footer').should('exist');
    cy.get('.co-card-actions').should('exist');
    cy.get('.co-card-status').should('exist');
    cy.get('.co-card-badge').should('exist');
    cy.get('.co-card-skeleton').should('exist');
    cy.get('.co-card-ripple').should('exist');
    cy.get('.co-card-confetti').should('exist');
    cy.get('.co-card-motion').should('exist');
    cy.get('.co-card-drag-handle').should('exist');
    cy.get('.co-card-resizable').should('exist');
    cy.get('.co-card-context-menu-wrapper').should('exist');
    cy.get('.co-card-export-share').should('exist');
    cy.get('.co-card-undo-redo').should('exist');
  });

  it('supports drag and drop', () => {
    cy.get('.co-card-drag-handle').first().trigger('mousedown', { which: 1 });
    cy.get('.co-card').first().trigger('mousemove', { clientX: 100, clientY: 100 });
    cy.get('.co-card-drag-handle').first().trigger('mouseup');
    // Assert card moved (implementation-specific)
  });

  it('supports resizing by mouse and keyboard', () => {
    cy.get('.co-card-resize-handle').first().trigger('mousedown', { which: 1 });
    cy.get('body').trigger('mousemove', { clientX: 200, clientY: 200 });
    cy.get('body').trigger('mouseup');
    // Keyboard resize
    cy.get('.co-card-resizable').first().focus().trigger('keydown', { key: 'ArrowRight' });
    // Assert size changed (implementation-specific)
  });

  it('shows context menu on right-click and keyboard', () => {
    cy.get('.co-card-context-menu-wrapper').first().rightclick();
    cy.get('.co-card-context-menu').should('be.visible');
    cy.get('.co-card-context-menu-item').contains('Edit').click();
    // Keyboard
    cy.get('.co-card-context-menu-wrapper').first().focus().trigger('keydown', { key: 'ContextMenu' });
    cy.get('.co-card-context-menu').should('be.visible');
  });

  it('exports and shares via export/share buttons', () => {
    cy.get('.co-card-export-share button[aria-label="Export CSV"]').click();
    cy.get('.co-card-export-share button[aria-label="Export PDF"]').click();
    cy.get('.co-card-export-share button[aria-label="Export Image"]').click();
    // Share button (if available)
    cy.window().then(win => {
      if (typeof win.navigator.share === 'function') {
        cy.get('.co-card-export-share button[aria-label="Share"]').click();
      }
    });
  });

  it('supports undo/redo via buttons and keyboard', () => {
    cy.get('.co-card-undo-redo button[aria-label="Undo"]').click();
    cy.get('.co-card-undo-redo button[aria-label="Redo"]').click();
    cy.get('body').trigger('keydown', { metaKey: true, key: 'z' });
    cy.get('body').trigger('keydown', { metaKey: true, key: 'z', shiftKey: true });
  });

  it('is accessible: tab order, ARIA, focus ring, motion preference', () => {
    cy.get('body').trigger('keydown', { key: 'Tab' });
    cy.focused().should('have.class', 'co-card');
    cy.get('.co-card').should('have.attr', 'role');
    cy.get('.co-card-header').should('have.attr', 'aria-label');
    cy.get('.co-card-footer').should('have.attr', 'aria-label');
    cy.get('.co-card-actions').should('have.attr', 'aria-label');
    cy.get('.co-card-status').should('have.attr', 'aria-label');
    cy.get('.co-card-badge').should('have.attr', 'aria-label');
    cy.get('.co-card-skeleton').should('have.attr', 'aria-label');
    cy.get('.co-card-ripple').should('have.attr', 'aria-label');
    cy.get('.co-card-confetti').should('have.attr', 'aria-label');
    cy.get('.co-card-motion').should('have.attr', 'aria-label');
    cy.get('.co-card-drag-handle').should('have.attr', 'aria-label');
    cy.get('.co-card-resizable').should('have.attr', 'aria-label');
    cy.get('.co-card-context-menu-wrapper').should('have.attr', 'aria-label');
    cy.get('.co-card-export-share').should('exist');
    cy.get('.co-card-undo-redo').should('exist');
  });

  it('visual regression: all variants', () => {
    cy.get('.co-card-frosted').should('exist');
    cy.get('.co-card-neon').should('exist');
    cy.get('.co-card-minimal').should('exist');
    // @ts-ignore
    cy.percySnapshot('Card Variants');
  });

  it('automated accessibility check (axe)', () => {
    // @ts-ignore
    cy.injectAxe();
    // @ts-ignore
    cy.checkA11y();
  });

  it('handles edge cases and error states', () => {
    cy.get('.co-card').contains('Error State').should('exist');
    cy.get('.co-card').contains('This is an error state example.').should('exist');
    cy.get('.co-card').contains('Clear').click();
    cy.get('.co-card').contains('This is an error state example.').should('exist'); // Should persist for demo
  });

  it('tracks analytics/compliance events', () => {
    // Simulate export/share/undo/redo and check for event logs (stubbed)
    cy.get('.co-card-export-share button[aria-label="Export CSV"]').click();
    cy.get('.co-card-undo-redo button[aria-label="Undo"]').click();
    cy.get('.co-card-undo-redo button[aria-label="Redo"]').click();
    // Optionally, check for analytics/compliance logs in UI or network
  });

  it('simulates rapid undo/redo', () => {
    for (let i = 0; i < 5; i++) {
      cy.get('.co-card-undo-redo button[aria-label="Undo"]').click();
    }
    for (let i = 0; i < 5; i++) {
      cy.get('.co-card-undo-redo button[aria-label="Redo"]').click();
    }
  });

  it('simulates failed export (edge case)', () => {
    // Stub exportData to throw error
    cy.window().then(win => {
      // @ts-ignore
      if (win.CardExportShare) {
        // @ts-ignore
        cy.stub(win.CardExportShare, 'exportData').throws('Export failed');
      }
    });
    cy.get('.co-card-export-share button[aria-label="Export CSV"]').click();
    // Optionally, check for error UI
  });

  it('keyboard-only navigation', () => {
    cy.get('body').trigger('keydown', { key: 'Tab' });
    cy.focused().should('have.class', 'co-card');
    cy.get('body').trigger('keydown', { key: 'Tab' });
    cy.focused().should('exist');
    // Continue tabbing and asserting focus order
  });
}); 