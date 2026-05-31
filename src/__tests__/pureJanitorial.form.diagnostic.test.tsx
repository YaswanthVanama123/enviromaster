

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../components/services/ServicesContext', () => ({
  useServicesContextOptional: () => ({
    updateService: vi.fn(),
    globalContractMonths: 12,
    getBackendPricingForService: () => ({
      serviceId: 'pureJanitorial',
      config: {
        productionRates: { office: 1000, home: 500, restaurant: 800, warehouse: 2000 },
        costPerHour: 20,
        laborTaxPct: 15,
        grossProfitPct: 33,
        defaultSupplies: {},
      },
    }),
    backendPricingData: [{ serviceId: 'pureJanitorial' }],
  }),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  faSync: 'sync-icon',
  faSpinner: 'spinner-icon',
  faTrash: 'trash-icon',
}));

import { JanitorialForm } from '../components/services/purejanitorial/JanitorialForm';

describe('Diagnostic Tests', () => {
  test('vitest is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('React is available', () => {
    expect(React).toBeDefined();
  });

  test('render function is available', () => {
    expect(render).toBeDefined();
  });

  test('can render a simple component', () => {
    const SimpleComponent = () => <div>Hello Test</div>;
    render(<SimpleComponent />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});

describe('Mock Tests', () => {
  test('vi.mock is available', () => {
    expect(vi.mock).toBeDefined();
  });

  test('vi.fn works', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

describe('JanitorialForm Component', () => {
  test('JanitorialForm is defined', () => {
    expect(JanitorialForm).toBeDefined();
  });

  test('can render JanitorialForm', () => {
    render(<JanitorialForm />);
    expect(screen.getByText('JANITORIAL')).toBeInTheDocument();
  });

  test('shows Frequency label', () => {
    render(<JanitorialForm />);
    expect(screen.getByText('Frequency')).toBeInTheDocument();
  });

  test('shows Square Feet label', () => {
    render(<JanitorialForm />);
    expect(screen.getByText('Square Feet')).toBeInTheDocument();
  });
});
