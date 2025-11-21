import React from 'react';
import { Chart } from '@/components/ui/Card/Chart';
import styles from './design.module.css';

export const MarkdownComponents = {
  ChartPreview: ({ symbol }: { symbol: string }) => (
    <div className={styles['markdown-chart-preview']}>
      <Chart type="line" data={[1, 2, 3, 4, 5, 6, 7]} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} ariaLabel={`Preview chart for ${symbol}`} />
      <div className={styles['markdown-chart-label']}>{symbol} Preview</div>
    </div>
  ),
  NewsPreview: ({ title, summary, url }: { title: string; summary: string; url: string }) => (
    <div className={styles['markdown-news-preview']}>
      <div className={styles['markdown-news-title']}>{title}</div>
      <div className={styles['markdown-news-summary']}>{summary}</div>
      <a href={url} className={styles['markdown-news-link']} target="_blank" rel="noopener noreferrer">Read more</a>
    </div>
  ),
  SocialPreview: ({ user, content, url }: { user: string; content: string; url: string }) => (
    <div className={styles['markdown-social-preview']}>
      <div className={styles['markdown-social-user']}>{user}</div>
      <div className={styles['markdown-social-content']}>{content}</div>
      <a href={url} className={styles['markdown-social-link']} target="_blank" rel="noopener noreferrer">View</a>
    </div>
  ),
  AdvancedChartPreview: ({ data, labels, type }: { data: number[]; labels: string[]; type: string }) => (
    <div className={styles['markdown-advanced-chart-preview']}>
      <Chart type={type as any} data={data} labels={labels} ariaLabel="Advanced chart preview" />
    </div>
  ),
  InlineAction: ({ actionId, onClick }: { actionId: string; onClick: () => void }) => (
    <button className={styles['markdown-inline-action']} onClick={onClick} aria-label={`Apply action: ${actionId}`}>{actionId}</button>
  ),
}; 