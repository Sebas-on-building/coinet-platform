import React from 'react';

// <LatestNews>: Atomic, presentational, stateless. Receives news via props only.
interface LatestNewsProps {
  news: { id: string; title: string; url: string }[];
}

export const LatestNews = ({ news }: LatestNewsProps) => (
  <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: 24 }}>
    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Latest News</div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {news.map((n) => (
        <li key={n.id} style={{ marginBottom: 12 }}>
          <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0A84FF', textDecoration: 'none', fontWeight: 500 }}>{n.title}</a>
        </li>
      ))}
    </ul>
  </div>
); 