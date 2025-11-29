import { render, screen, fireEvent } from '@testing-library/react';
import TOTPInput from '../TOTPInput';

describe('TOTPInput', () => {
  it('renders 6 input boxes and handles input', () => {
    const handleChange = jest.fn();
    render(<TOTPInput value="" onChange={handleChange} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    fireEvent.change(inputs[0], { target: { value: '1' } });
    expect(handleChange).toHaveBeenCalledWith('1');
  });

  it('shows error message', () => {
    render(<TOTPInput value="" onChange={() => { }} error="Invalid code" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid code');
  });
}); 