let rules = { conventional: true, customRegex: '' };
export async function getLintRules() {
  return rules;
}
export async function setLintRules(newRules: any) {
  rules = newRules;
  return rules;
} 