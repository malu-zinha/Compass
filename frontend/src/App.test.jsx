import { render, screen } from '@testing-library/react';
import App from './App';

test('renderiza a landing page', () => {
  render(<App />);
  expect(screen.getAllByAltText('Compass').length).toBeGreaterThan(0);
});
