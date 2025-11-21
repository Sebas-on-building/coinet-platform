export async function getPullRequests() {
  return [
    { id: 1, title: 'Add new feature', status: 'open', reviewers: ['Alice'], checks: 'passing' },
    { id: 2, title: 'Fix bug', status: 'merged', reviewers: ['Bob'], checks: 'failing' }
  ];
}

export async function createPullRequest(pr: any) {
  return { ...pr, id: Math.random(), status: 'open', reviewers: [], checks: 'pending' };
} 