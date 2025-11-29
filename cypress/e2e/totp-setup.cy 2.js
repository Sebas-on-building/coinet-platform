describe('TOTP Setup Wizard', () => {
  it('completes the 2FA flow', () => {
    cy.visit('/settings/security');
    cy.contains('Enable 2FA').click();
    cy.contains('Get Started').click();
    cy.contains('Scan the QR Code');
    cy.contains('Next').click();
    cy.get('input[aria-label="Digit 1"]').type('1');
    cy.get('input[aria-label="Digit 2"]').type('2');
    cy.get('input[aria-label="Digit 3"]').type('3');
    cy.get('input[aria-label="Digit 4"]').type('4');
    cy.get('input[aria-label="Digit 5"]').type('5');
    cy.get('input[aria-label="Digit 6"]').type('6');
    cy.contains('Verify').click();
    cy.contains('Save Your Backup Codes');
    cy.contains('Finish').click();
    cy.contains('2FA Enabled!');
    cy.contains('Next: Manage Devices').click();
    cy.contains('Manage Devices');
    cy.contains('Continue').click();
    cy.contains('Setup Audit Trail');
    cy.contains('Done').click();
  });
}); 