import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { SocialPost } from "../services/socialMedia";
import { MLSentimentScore } from "../services/mlSentimentAnalysis";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface SentimentTimelineProps {
  posts: (SocialPost & { mlAnalysis: MLSentimentScore })[];
}

interface SentimentDistributionProps {
  posts: (SocialPost & { mlAnalysis: MLSentimentScore })[];
}

interface LanguageBreakdownProps {
  languageBreakdown: Record<string, number>;
}

export const SentimentTimeline: React.FC<SentimentTimelineProps> = ({
  posts,
}) => {
  const data: ChartData<"line"> = {
    labels: posts.map((post) => new Date(post.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: "Sentiment Score",
        data: posts.map((post) => post.mlAnalysis.score),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: false,
      },
      {
        label: "Confidence",
        data: posts.map((post) => post.mlAnalysis.confidence),
        borderColor: "rgb(153, 102, 255)",
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Sentiment Analysis Timeline",
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const post = posts[context.dataIndex];
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}
                   Content: ${post.content.substring(0, 50)}...`;
          },
        },
      },
    },
    scales: {
      y: {
        min: -1,
        max: 1,
      },
    },
  };

  return <Line data={data} options={options} />;
};

export const SentimentDistribution: React.FC<SentimentDistributionProps> = ({
  posts,
}) => {
  const sentimentCounts = posts.reduce(
    (acc, post) => {
      const score = post.mlAnalysis.score;
      if (score > 0.2) acc.positive++;
      else if (score < -0.2) acc.negative++;
      else acc.neutral++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );

  const data: ChartData<"bar"> = {
    labels: ["Positive", "Neutral", "Negative"],
    datasets: [
      {
        label: "Number of Posts",
        data: [
          sentimentCounts.positive,
          sentimentCounts.neutral,
          sentimentCounts.negative,
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(255, 99, 132, 0.6)",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Sentiment Distribution",
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export const LanguageBreakdown: React.FC<LanguageBreakdownProps> = ({
  languageBreakdown,
}) => {
  const data: ChartData<"bar"> = {
    labels: Object.keys(languageBreakdown),
    datasets: [
      {
        label: "Posts by Language",
        data: Object.values(languageBreakdown),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Language Distribution",
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export const SentimentDashboard: React.FC<{
  posts: (SocialPost & { mlAnalysis: MLSentimentScore })[];
  languageBreakdown: Record<string, number>;
}> = ({ posts, languageBreakdown }) => {
  return (
    <div className="sentiment-dashboard">
      <div className="dashboard-row">
        <div className="dashboard-cell">
          <SentimentTimeline posts={posts} />
        </div>
      </div>
      <div className="dashboard-row">
        <div className="dashboard-cell">
          <SentimentDistribution posts={posts} />
        </div>
        <div className="dashboard-cell">
          <LanguageBreakdown languageBreakdown={languageBreakdown} />
        </div>
      </div>
      <style jsx>{`
        .sentiment-dashboard {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .dashboard-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .dashboard-cell {
          flex: 1;
          min-width: 0;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
