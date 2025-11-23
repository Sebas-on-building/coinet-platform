export async function getReviewDashboard() {
  return [
    { id: 1, pr: 'Add new feature', reviewer: 'Alice', status: 'pending' },
    { id: 2, pr: 'Fix bug', reviewer: 'Bob', status: 'approved' }
  ];
} 