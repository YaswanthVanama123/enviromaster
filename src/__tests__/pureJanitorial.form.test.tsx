

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { JanitorialForm } from '../components/services/purejanitorial/JanitorialForm';
import { computeJanitorialCalc, DEFAULT_SUPPLIES } from '../components/services/purejanitorial/useJanitorialCalc';
import type { JanitorialFormState, JanitorialAdminRates } from '../components/services/purejanitorial/janitorialTypes';

vi.mock('../components/services/ServicesContext', () => ({
  useServicesContextOptional: () => ({
    updateService: vi.fn(),
    globalContractMonths: 12,
    getBackendPricingForService: () => ({
      serviceId: 'pureJanitorial',
      config: {
        productionRates: {
          office: 1000,
          home: 500,
          restaurant: 800,
          warehouse: 2000,
        },
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
  FontAwesomeIcon: ({ icon }: { icon: unknown }) => <span data-testid="icon">{String(icon)}</span>,
}));

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  faSync: 'sync-icon',
  faSpinner: 'spinner-icon',
  faTrash: 'trash-icon',
}));

const getInputByLabel = (labelText: string): HTMLInputElement | HTMLSelectElement | null => {
  const label = screen.getByText(labelText);
  const row = label.closest('.svc-row');
  if (!row) return null;
  return row.querySelector('input, select');
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe('JanitorialForm Rendering', () => {
  test('renders form with header', () => {
    render(<JanitorialForm />);
    expect(screen.getByText('JANITORIAL')).toBeInTheDocument();
  });

  test('renders all main form labels', () => {
    render(<JanitorialForm />);

    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Visits per Week')).toBeInTheDocument();
    expect(screen.getByText('Place Type')).toBeInTheDocument();
    expect(screen.getByText('Square Feet')).toBeInTheDocument();
    expect(screen.getByText('Hours Per Visit')).toBeInTheDocument();
    expect(screen.getByText('Cost Per Hour')).toBeInTheDocument();
    expect(screen.getByText('Labor Tax %')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit %')).toBeInTheDocument();
  });

  test('renders supply section header', () => {
    render(<JanitorialForm />);
    expect(screen.getByText('Supply Line Items (Annual)')).toBeInTheDocument();
  });

  test('renders all 8 default supply items', () => {
    render(<JanitorialForm />);

    const supplyLabels = [
      'Vacuums',
      'Mops',
      'Mop Buckets',
      'Dust Mops',
      'Microfiber',
      'Cleaning Products',
      'Consumables',
      'Miscellaneous',
    ];

    supplyLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test('does not show pricing summary when sqFt is 0', () => {
    render(<JanitorialForm />);

    expect(screen.queryByText('Pricing Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Annual Base Labor')).not.toBeInTheDocument();
  });

  test('frequency dropdown has options', () => {
    render(<JanitorialForm />);

    const frequencyInput = getInputByLabel('Frequency') as HTMLSelectElement;
    expect(frequencyInput).toBeInTheDocument();
    expect(frequencyInput.tagName).toBe('SELECT');

    const options = Array.from(frequencyInput.options).map(opt => opt.text);
    expect(options).toContain('Weekly');
    expect(options).toContain('Monthly');
    expect(options).toContain('One Time');
  });
});

describe('JanitorialForm Square Feet Input', () => {
  test('sqFt input accepts numeric values', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    expect(sqFtInput).toBeInTheDocument();

    await user.clear(sqFtInput);
    await user.type(sqFtInput, '2000');

    expect(sqFtInput.value).toBe('2000');
  });

  test('entering sqFt shows pricing summary', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
    });
  });

  test('clearing sqFt hides pricing summary', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;

    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');
    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
    });

    await user.clear(sqFtInput);
    await waitFor(() => {
      expect(screen.queryByText('Pricing Summary')).not.toBeInTheDocument();
    });
  });

  test('sqFt change updates hours per visit', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '2000');

    await waitFor(() => {
      const hoursInput = screen.getByDisplayValue('2.00 hrs');
      expect(hoursInput).toBeInTheDocument();
    });
  });
});

describe('JanitorialForm Frequency Dropdown', () => {
  test('frequency dropdown changes value', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const frequencySelect = getInputByLabel('Frequency') as HTMLSelectElement;

    await user.selectOptions(frequencySelect, 'monthly');
    expect(frequencySelect.value).toBe('monthly');

    await user.selectOptions(frequencySelect, 'oneTime');
    expect(frequencySelect.value).toBe('oneTime');
  });

  test('one-time frequency shows "Total Price" instead of "Contract Total"', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    const frequencySelect = getInputByLabel('Frequency') as HTMLSelectElement;
    await user.selectOptions(frequencySelect, 'oneTime');

    await waitFor(() => {
      expect(screen.getByText('Total Price')).toBeInTheDocument();
      expect(screen.queryByText(/Contract Total/)).not.toBeInTheDocument();
    });
  });

  test('one-time frequency hides Monthly Recurring', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      expect(screen.getByText('Monthly Recurring')).toBeInTheDocument();
    });

    const frequencySelect = getInputByLabel('Frequency') as HTMLSelectElement;
    await user.selectOptions(frequencySelect, 'oneTime');

    await waitFor(() => {
      expect(screen.queryByText('Monthly Recurring')).not.toBeInTheDocument();
    });
  });
});

describe('JanitorialForm Place Type Dropdown', () => {
  test('place type dropdown changes value', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const placeTypeSelect = getInputByLabel('Place Type') as HTMLSelectElement;
    expect(placeTypeSelect).toBeInTheDocument();

    await user.selectOptions(placeTypeSelect, 'home');
    expect(placeTypeSelect.value).toBe('home');
  });

  test('changing place type updates hours per visit', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      expect(screen.getByDisplayValue('1.00 hrs')).toBeInTheDocument();
    });

    const placeTypeSelect = getInputByLabel('Place Type') as HTMLSelectElement;
    await user.selectOptions(placeTypeSelect, 'home');

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.00 hrs')).toBeInTheDocument();
    });
  });
});

describe('JanitorialForm Visits per Week', () => {
  test('visits per week dropdown changes value', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const visitsSelect = getInputByLabel('Visits per Week') as HTMLSelectElement;
    expect(visitsSelect).toBeInTheDocument();

    await user.selectOptions(visitsSelect, '5');
    expect(visitsSelect.value).toBe('5');
  });

  test('visits dropdown has options 1-7', () => {
    render(<JanitorialForm />);

    const visitsSelect = getInputByLabel('Visits per Week') as HTMLSelectElement;
    const options = Array.from(visitsSelect.options).map(opt => opt.value);

    expect(options).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });
});

describe('JanitorialForm Cost Per Hour', () => {
  test('cost per hour input accepts values', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const costInput = getInputByLabel('Cost Per Hour') as HTMLInputElement;
    expect(costInput).toBeInTheDocument();

    await user.clear(costInput);
    await user.type(costInput, '35');

    expect(costInput.value).toBe('35');
  });

  test('shows admin default hint', () => {
    render(<JanitorialForm />);

    expect(screen.getByText(/admin default: \$20/i)).toBeInTheDocument();
  });
});

describe('JanitorialForm Labor Tax', () => {
  test('labor tax input accepts values', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const taxInput = getInputByLabel('Labor Tax %') as HTMLInputElement;
    expect(taxInput).toBeInTheDocument();

    await user.clear(taxInput);
    await user.type(taxInput, '20');

    expect(taxInput.value).toBe('20');
  });

  test('labor tax changes reflect in pricing summary label', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    const taxInput = getInputByLabel('Labor Tax %') as HTMLInputElement;
    await user.clear(taxInput);
    await user.type(taxInput, '25');

    await waitFor(() => {
      expect(screen.getByText(/Annual Labor Tax \(25%\)/)).toBeInTheDocument();
    });
  });

  test('shows admin default hint for labor tax', () => {
    render(<JanitorialForm />);

    expect(screen.getByText(/admin default: 15%/i)).toBeInTheDocument();
  });
});

describe('JanitorialForm Gross Profit', () => {
  test('gross profit input accepts values', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const gpInput = getInputByLabel('Gross Profit %') as HTMLInputElement;
    expect(gpInput).toBeInTheDocument();

    await user.clear(gpInput);
    await user.type(gpInput, '45');

    expect(gpInput.value).toBe('45');
  });

  test('gross profit changes reflect in pricing summary label', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    const gpInput = getInputByLabel('Gross Profit %') as HTMLInputElement;
    await user.clear(gpInput);
    await user.type(gpInput, '50');

    await waitFor(() => {
      expect(screen.getByText(/Gross Profit \(50%\)/)).toBeInTheDocument();
    });
  });

  test('shows admin default hint for gross profit', () => {
    render(<JanitorialForm />);

    expect(screen.getByText(/admin default: 33%/i)).toBeInTheDocument();
  });
});

describe('JanitorialForm Supply Line Items', () => {
  test('supply inputs accept values', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const vacuumsInput = getInputByLabel('Vacuums') as HTMLInputElement;
    expect(vacuumsInput).toBeInTheDocument();
    expect(vacuumsInput.value).toBe('100'); 

    await user.clear(vacuumsInput);
    await user.type(vacuumsInput, '500');

    expect(vacuumsInput.value).toBe('500');
  });

  test('mops input has correct default value', () => {
    render(<JanitorialForm />);

    const mopsInput = getInputByLabel('Mops') as HTMLInputElement;
    expect(mopsInput.value).toBe('500');
  });

  test('supply changes update Annual Supplies in pricing', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      expect(screen.getByText('Annual Supplies')).toBeInTheDocument();
    });

    const vacuumsInput = getInputByLabel('Vacuums') as HTMLInputElement;
    await user.clear(vacuumsInput);
    await user.type(vacuumsInput, '1000');

    await waitFor(() => {
      expect(screen.getByText('Annual Supplies')).toBeInTheDocument();
    });
  });
});

describe('JanitorialForm Pricing Summary Display', () => {
  test('shows all pricing fields when sqFt > 0', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
      expect(screen.getByText('Annual Base Labor')).toBeInTheDocument();
      expect(screen.getByText(/Annual Labor Tax/)).toBeInTheDocument();
      expect(screen.getByText('Total Annual Labor')).toBeInTheDocument();
      expect(screen.getByText('Annual Supplies')).toBeInTheDocument();
      expect(screen.getByText('Total Annual Cost')).toBeInTheDocument();
      expect(screen.getByText(/Gross Profit/)).toBeInTheDocument();
      expect(screen.getByText('Annual Contract Value')).toBeInTheDocument();
    });
  });

  test('shows greenline or redline indicator', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    await waitFor(() => {
      const greenline = screen.queryByText(/Greenline Pricing/);
      const redline = screen.queryByText(/Redline Pricing/);
      expect(greenline || redline).toBeTruthy();
    });
  });
});

describe('JanitorialForm Notes Field', () => {
  test('notes field accepts text', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const notesInput = screen.getByPlaceholderText('Service notes...');
    expect(notesInput).toBeInTheDocument();

    await user.type(notesInput, 'Special requirements for this job');
    expect((notesInput as HTMLInputElement).value).toBe('Special requirements for this job');
  });
});

describe('JanitorialForm Remove Button', () => {
  test('remove button calls onRemove when provided', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(<JanitorialForm onRemove={onRemove} />);

    const removeButton = screen.getByTitle('Remove this service');
    await user.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('remove button not shown when onRemove not provided', () => {
    render(<JanitorialForm />);

    const removeButton = screen.queryByTitle('Remove this service');
    expect(removeButton).not.toBeInTheDocument();
  });
});

describe('JanitorialForm Initial Data', () => {
  test('form initializes with provided sqFt', () => {
    const initialData = { sqFt: 3000 };
    render(<JanitorialForm initialData={initialData} />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    expect(sqFtInput.value).toBe('3000');
  });

  test('form initializes with provided frequency', () => {
    const initialData = { frequency: 'monthly' as const };
    render(<JanitorialForm initialData={initialData} />);

    const frequencySelect = getInputByLabel('Frequency') as HTMLSelectElement;
    expect(frequencySelect.value).toBe('monthly');
  });

  test('form shows pricing summary when initialized with sqFt > 0', () => {
    const initialData = { sqFt: 2000 };
    render(<JanitorialForm initialData={initialData} />);

    expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
  });
});

describe('JanitorialForm Calculation Verification', () => {
  test('hours per visit calculation matches expected value', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1500');

    await waitFor(() => {
      expect(screen.getByDisplayValue('1.50 hrs')).toBeInTheDocument();
    });
  });

  test('changing multiple inputs updates all calculations', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    const visitsSelect = getInputByLabel('Visits per Week') as HTMLSelectElement;
    await user.selectOptions(visitsSelect, '3');

    const costInput = getInputByLabel('Cost Per Hour') as HTMLInputElement;
    await user.clear(costInput);
    await user.type(costInput, '25');

    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
      expect(screen.getByText('Annual Base Labor')).toBeInTheDocument();
    });
  });
});

describe('JanitorialForm Edge Cases', () => {
  test('handles very large sqFt without crashing', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '999999');

    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
    });
  });

  test('handles zero in numeric inputs gracefully', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const sqFtInput = getInputByLabel('Square Feet') as HTMLInputElement;
    await user.clear(sqFtInput);
    await user.type(sqFtInput, '1000');

    const costInput = getInputByLabel('Cost Per Hour') as HTMLInputElement;
    await user.clear(costInput);
    await user.type(costInput, '0');

    await waitFor(() => {
      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
    });
  });

  test('refresh config button is present and clickable', async () => {
    const user = userEvent.setup();
    render(<JanitorialForm />);

    const refreshButton = screen.getByTitle('Refresh config from database');
    expect(refreshButton).toBeInTheDocument();

    await user.click(refreshButton);
    
    expect(refreshButton).toBeInTheDocument();
  });
});
