import { describe, expect, it } from 'vitest';
import { amountInWords, invoiceTotals } from './invoice-sheet';

describe('invoiceTotals', () => {
  it('totals a zero-tax invoice', () => {
    expect(invoiceTotals({ taxRate: 0, lineItems: [{ description: 'Work', quantity: 2, unitPrice: 10000 }] })).toMatchObject({
      subtotal: 20000, discount: 0, taxable: 20000, taxAmount: 0, total: 20000,
    });
  });

  it('applies the overall discount before inter-state GST', () => {
    const t = invoiceTotals({ taxRate: 0.18, isInterState: true, overallDiscount: 1000, lineItems: [{ description: 'X', quantity: 1, unitPrice: 50000 }] });
    expect(t).toMatchObject({ taxable: 49000, igstAmount: 8820, cgstAmount: 0, sgstAmount: 0, total: 57820 });
  });

  it('splits intra-state GST evenly into CGST and SGST', () => {
    const t = invoiceTotals({ taxRate: 0.18, lineItems: [{ description: 'X', quantity: 1, unitPrice: 10000 }] });
    expect(t).toMatchObject({ cgstAmount: 900, sgstAmount: 900, igstAmount: 0, total: 11800 });
  });

  it('clamps line discounts to 0–100% and ignores bad numbers', () => {
    const t = invoiceTotals({
      taxRate: 0,
      overallDiscount: -50,
      lineItems: [
        { description: 'A', quantity: 1, unitPrice: 1000, discountPercent: 150 },
        { description: 'B', quantity: 2, unitPrice: 500, discountPercent: 10 },
        { description: 'C', quantity: Number.NaN, unitPrice: 999 },
      ],
    });
    expect(t).toMatchObject({ subtotal: 2000, discount: 1100, taxable: 900, total: 900 });
  });

  it('never produces a negative taxable amount', () => {
    expect(invoiceTotals({ taxRate: 0.18, overallDiscount: 5000, lineItems: [{ description: 'X', quantity: 1, unitPrice: 1000 }] }).total).toBe(0);
  });
});

describe('amountInWords', () => {
  it.each([
    [0, 'Indian Rupee Zero Only'],
    [7, 'Indian Rupee Seven Only'],
    [115, 'Indian Rupee One Hundred Fifteen Only'],
    [20000, 'Indian Rupee Twenty Thousand Only'],
    [57820, 'Indian Rupee Fifty Seven Thousand Eight Hundred Twenty Only'],
    [1250000, 'Indian Rupee Twelve Lakh Fifty Thousand Only'],
    [123456789, 'Indian Rupee Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine Only'],
    [-500.6, 'Indian Rupee Five Hundred One Only'],
  ])('%d → %s', (amount, words) => {
    expect(amountInWords(amount)).toBe(words);
  });
});
