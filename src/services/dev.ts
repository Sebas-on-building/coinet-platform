// Dev activity data service for CoinProfile
// Extensible for GitHub, GitLab, Bitbucket, etc.

export async function getDevStats(coinId: string): Promise<any> {
  // Placeholder: Use real APIs for GitHub, GitLab, etc. in production
  if (coinId === "bitcoin") {
    return {
      commits: 1200,
      contributors: 85,
      releases: 32,
      repoHealth: "Excellent",
      stars: 35000,
      forks: 18000,
      openIssues: 120,
      lastUpdated: new Date().toISOString(),
    };
  }
  // TODO: Add more coins and real API integration
  return {
    commits: null,
    contributors: null,
    releases: null,
    repoHealth: null,
    stars: null,
    forks: null,
    openIssues: null,
    lastUpdated: null,
  };
}

export async function getDeepDevStats(coinId: string): Promise<any> {
  // Placeholder: Use real APIs for GitHub, GitLab, Bitbucket, etc. in production
  // Simulate trends and anomalies
  const mockTrends = {
    commits: [100, 120, 110, 130, 140, 125, 150],
    contributors: [10, 12, 11, 13, 14, 12, 15],
    issues: [20, 18, 22, 19, 25, 21, 30],
    stars: [34000, 34200, 34500, 34700, 34900, 35000, 35100],
    forks: [17500, 17600, 17700, 17800, 17900, 18000, 18100],
  };
  const anomaly =
    mockTrends.issues[6] >
    (1.5 * mockTrends.issues.slice(0, 6).reduce((a, b) => a + b, 0)) / 6;
  const anomalies = anomaly
    ? [
        {
          metric: "issues",
          description: "Spike in open issues",
          date: new Date().toISOString(),
        },
      ]
    : [];

  return {
    commits: 150,
    contributors: 15,
    releases: 2,
    repoHealth: "Excellent",
    stars: 35100,
    forks: 18100,
    openIssues: 30,
    pullRequests: 8,
    codeChurn: 0.12, // percent of code changed this week
    auditStatus: "Audited",
    activityTrends: mockTrends,
    anomalies,
    aiExplainer:
      "Development activity is strong with a healthy number of contributors and regular releases. Recent spike in issues may warrant attention.",
    qna: [],
    lastUpdated: new Date().toISOString(),
    definition:
      "Aggregated development metrics from GitHub, GitLab, and more. Includes commits, contributors, repo health, code churn, and anomaly detection.",
  };
}
// Extensibility: Add more metrics, providers, and error handling as needed.
