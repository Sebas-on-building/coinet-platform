describe('Coinet Registration Flow', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('renders the registration form and validates fields', () => {
    cy.findByLabelText(/email/i).should('exist');
    cy.findByLabelText(/password/i).should('exist');
    cy.findByLabelText(/confirm password/i).should('exist');
    cy.findByRole('button', { name: /register/i }).click();
    cy.findByText(/email is required/i).should('exist');
    cy.findByText(/password is required/i).should('exist');
    cy.findByText(/please confirm your password/i).should('exist');
  });

  it('shows error if passwords do not match', () => {
    cy.findByLabelText(/email/i).type('test@example.com');
    cy.findByLabelText(/password/i).type('averysecurepassword');
    cy.findByLabelText(/confirm password/i).type('differentpassword');
    cy.findByRole('button', { name: /register/i }).click();
    cy.findByText(/passwords do not match/i).should('exist');
  });

  it('completes registration and OTP flow', () => {
    cy.findByLabelText(/email/i).type('test@example.com');
    cy.findByLabelText(/password/i).type('averysecurepassword');
    cy.findByLabelText(/confirm password/i).type('averysecurepassword');
    // Simulate captcha (if needed, mock backend)
    cy.window().then(win => {
      win.grecaptcha = { execute: () => Promise.resolve('test-token') };
    });
    cy.findByRole('button', { name: /register/i }).click();
    cy.findByText(/verify your email/i).should('exist');
    // Simulate OTP input
    cy.get('input[aria-label="Digit 1"]').type('1');
    cy.get('input[aria-label="Digit 2"]').type('2');
    cy.get('input[aria-label="Digit 3"]').type('3');
    cy.get('input[aria-label="Digit 4"]').type('4');
    cy.get('input[aria-label="Digit 5"]').type('5');
    cy.get('input[aria-label="Digit 6"]').type('6');
    cy.findByRole('button', { name: /verify/i }).click();
    // Success message
    cy.findByText(/email verified/i).should('exist');
  });

  it('is accessible (axe)', () => {
    cy.injectAxe();
    cy.checkA11y();
  });

  it('works in dark mode', () => {
    cy.get('html').invoke('attr', 'class', 'dark');
    cy.findByLabelText(/email/i).should('have.class', 'dark:text-white');
  });
}); 