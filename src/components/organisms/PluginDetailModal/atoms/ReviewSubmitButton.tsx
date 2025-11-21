import React from 'react';
import styles from './ReviewSubmitButton.module.css';

interface ReviewSubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
}

export const ReviewSubmitButton: React.FC<ReviewSubmitButtonProps> = ({ loading, disabled }) => (
  <button
    type="submit"
    className={styles.button}
    disabled={disabled || loading}
    aria-busy={loading}
    aria-disabled={disabled || loading}
  >
    {loading ? <span className={styles.spinner} aria-label="Loading" /> : 'Submit Review'}
  </button>
); 