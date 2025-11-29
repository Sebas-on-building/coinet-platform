let rules = { requiredReviews: 2, statusChecks: true };
export async function getProtectionRules() {
  return rules;
}
export async function setProtectionRules(newRules: any) {
  rules = newRules;
  return rules;
} 