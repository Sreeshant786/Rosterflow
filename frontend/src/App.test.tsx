import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('RosterFlow Frontend Suite', () => {
  it('renders application brand and navigation links correctly', () => {
    render(<App />);
    expect(screen.getByText('RosterFlow')).toBeDefined();
    expect(screen.getByText('Workforce Ops OS')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Roster Planner')).toBeDefined();
    expect(screen.getByText('Conflict Centre')).toBeDefined();
    expect(screen.getByText('Scenario Walkthrough')).toBeDefined();
  });
});
