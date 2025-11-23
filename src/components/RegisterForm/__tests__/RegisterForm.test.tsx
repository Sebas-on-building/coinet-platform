import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterForm from '../RegisterForm';

jest.mock('../../utils/i18n', () => ({ t: (k: string, vars?: any) => k }));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ entropy: 4.2 }),
  })
) as jest.Mock;

describe('RegisterForm', () => {
  it('renders the registration form', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText('register.form_aria')).toBeInTheDocument();
    expect(screen.getByLabelText('register.email_label')).toBeInTheDocument();
    expect(screen.getByLabelText('register.password_label')).toBeInTheDocument();
    expect(screen.getByLabelText('register.confirm_label')).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByText('register.submit'));
    await waitFor(() => {
      expect(screen.getByText('register.email_required')).toBeInTheDocument();
      expect(screen.getByText('register.password_required')).toBeInTheDocument();
      expect(screen.getByText('register.confirm_required')).toBeInTheDocument();
    });
  });

  it('shows error if passwords do not match', async () => {
    render(<RegisterForm />);
    fireEvent.input(screen.getByLabelText('register.email_label'), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText('register.password_label'), { target: { value: 'averysecurepassword' } });
    fireEvent.input(screen.getByLabelText('register.confirm_label'), { target: { value: 'differentpassword' } });
    fireEvent.click(screen.getByText('register.submit'));
    await waitFor(() => {
      expect(screen.getByText('register.passwords_no_match')).toBeInTheDocument();
    });
  });

  it('submits form and shows OTP step on success', async () => {
    render(<RegisterForm />);
    fireEvent.input(screen.getByLabelText('register.email_label'), { target: { value: 'test@example.com' } });
    fireEvent.input(screen.getByLabelText('register.password_label'), { target: { value: 'averysecurepassword' } });
    fireEvent.input(screen.getByLabelText('register.confirm_label'), { target: { value: 'averysecurepassword' } });
    // Simulate captcha
    fireEvent.change(screen.getByLabelText('register.email_label'), { target: { value: 'test@example.com' } });
    // Bypass captcha for test
    fireEvent.click(screen.getByText('register.submit'));
    await waitFor(() => {
      expect(screen.getByText('otp.title')).toBeInTheDocument();
    });
  });
}); 