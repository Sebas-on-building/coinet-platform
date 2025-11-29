import React, { useEffect, useState } from 'react';
import { Card } from '../design-system/Card';

export function Recommendations() {
  const [recs, setRecs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/recommendations')
      .then(res => res.json())
      .then(data => setRecs(data.recommendations));
  }, []);
  return (
    <Card>
      <h3>Recommended for you</h3>
      <ul>
        {recs.map((r, i) => (
          <li key={i}><a href={r.link}>{r.action}</a></li>
        ))}
      </ul>
    </Card>
  );
} 