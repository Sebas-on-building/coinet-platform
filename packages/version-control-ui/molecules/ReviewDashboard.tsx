import React, { useEffect, useState } from 'react';
export function ReviewDashboard() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    fetch('/api/code-review/dashboard').then(res => res.json()).then(setReviews);
  }, []);
  return (
    <ul>
      {reviews.map(r => (
        <li key={r.id}>{r.pr} - {r.reviewer} - {r.status}</li>
      ))}
    </ul>
  );
} 