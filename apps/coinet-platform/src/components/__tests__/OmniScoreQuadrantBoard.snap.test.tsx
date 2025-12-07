/**
 * Snapshot smoke tests for OmniScoreQuadrantBoard
 * Note: The main backend tsconfig excludes src/components, so these won't affect tsc build.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OmniScoreQuadrantBoard } from '../OmniScoreQuadrantBoard';
import { allOkProjects, someGatedProjects, lowPeerConfidenceProjects } from '../__fixtures__/omniscore-quadrant.fixtures';

describe('OmniScoreQuadrantBoard snapshots', () => {
  it('renders all-ok dataset', () => {
    const { container } = render(<OmniScoreQuadrantBoard projects={allOkProjects} showVectors={true} />);
    expect(screen.getByText(/Target Zone/i)).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders some-gated dataset', () => {
    const { container } = render(<OmniScoreQuadrantBoard projects={someGatedProjects} showVectors={true} />);
    expect(screen.getByText(/Target Zone/i)).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders low-peerConfidence dataset', () => {
    const { container } = render(<OmniScoreQuadrantBoard projects={lowPeerConfidenceProjects} showVectors={true} />);
    expect(screen.getByText(/Target Zone/i)).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});

