import React from "react";
import zxcvbn from "zxcvbn";
import { t } from '../../utils/i18n';

interface Props {
  password: string;
  entropy?: number; // Optional entropy score from backend
}

const strengthLabels = [
  t('register.strength_very_weak'),
  t('register.strength_weak'),
  t('register.strength_okay'),
  t('register.strength_strong'),
  t('register.strength_unbreakable'),
];
const strengthColors = [
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-blue-500",
  "bg-green-500",
];

const PasswordStrengthMeter: React.FC<Props> = ({ password, entropy }) => {
  const { score, feedback } = zxcvbn(password);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center space-x-2">
        <div
          className={`flex-1 h-2 rounded transition-all duration-500 ${strengthColors[score]}`}
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}
        ></div>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-2">
          {strengthLabels[score]}
        </span>
        {typeof entropy === 'number' && (
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{t('register.entropy_label', { entropy: entropy.toFixed(2) })}</span>
        )}
      </div>
      {password && feedback.suggestions.length > 0 && (
        <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 list-disc list-inside animate-fade-in">
          {feedback.suggestions.map((tip, i) => (
            <li key={i}>{t('register.suggestion', { suggestion: tip })}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
