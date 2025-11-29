export async function getAISuggestion(branch: string, question: string) {
  return `AI suggestion for branch ${branch}: ${question || 'No question asked.'}`;
} 