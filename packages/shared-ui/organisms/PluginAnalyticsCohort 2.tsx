import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginAnalyticsCohortProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

// Dummy cohort table for now
export const PluginAnalyticsCohort: React.FC<PluginAnalyticsCohortProps> = ({ pluginId, theme = 'light' }) => {
  // TODO: Fetch real cohort data from backend
  const data = [
    { cohort: '2024-06-01', week1: 100, week2: 80, week3: 60, week4: 50 },
    { cohort: '2024-06-08', week1: 90, week2: 70, week3: 55, week4: 40 },
    { cohort: '2024-06-15', week1: 110, week2: 85, week3: 65, week4: 55 },
  ];
  return (
    <div style={{ width: '100%', background: tokens.colors.surface[theme], borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginTop: tokens.spacing.md }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: tokens.colors.text[theme] }}>
        <thead>
          <tr>
            <th>Cohort</th>
            <th>Week 1</th>
            <th>Week 2</th>
            <th>Week 3</th>
            <th>Week 4</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.cohort}</td>
              <td>{row.week1}</td>
              <td>{row.week2}</td>
              <td>{row.week3}</td>
              <td>{row.week4}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 