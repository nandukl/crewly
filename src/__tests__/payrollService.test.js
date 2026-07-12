import { describe, it, expect } from 'vitest';
import { payrollService } from '../lib/payrollService';

describe('payrollService math', () => {
  describe('calculatePayrollPreview', () => {
    it('calculates gross and net pay correctly for a full month', () => {
      const profile = {
        base_amount: 5000,
        allowances: [
          { type: 'fixed', amount: 500 },
          { type: 'percentage', percentage: 10 } // 10% of 5000 = 500
        ],
        deductions: [
          { type: 'fixed', amount: 200 },
          { type: 'percentage', percentage: 5 } // 5% of 5000 = 250
        ],
        employee: {
          date_of_joining: '2020-01-01'
        }
      };

      const result = payrollService.calculatePayrollPreview(profile, 4, 2024); // April has 30 days
      
      expect(result.allowanceTotal).toBe(1000);
      expect(result.deductionTotal).toBe(450);
      expect(result.grossPay).toBe(6000); // 5000 + 1000
      expect(result.netPay).toBe(5550); // 6000 - 450
    });

    it('prorates salary based on Date of Joining (DOJ) in the middle of the month', () => {
      const profile = {
        base_amount: 6000,
        allowances: [],
        deductions: [],
        employee: {
          date_of_joining: '2024-04-16' // Joined halfway through a 30-day month (15 days worked)
        }
      };

      const result = payrollService.calculatePayrollPreview(profile, 4, 2024);
      
      // 6000 * (15 / 30) = 3000
      expect(result.grossPay).toBe(3000);
      expect(result.netPay).toBe(3000);
    });

    it('does not prorate if DOJ is before the current month', () => {
      const profile = {
        base_amount: 6000,
        allowances: [],
        deductions: [],
        employee: {
          date_of_joining: '2024-03-31'
        }
      };

      const result = payrollService.calculatePayrollPreview(profile, 4, 2024);
      
      expect(result.grossPay).toBe(6000);
    });
    
    it('returns 0 if DOJ is after the current month', () => {
      const profile = {
        base_amount: 6000,
        allowances: [],
        deductions: [],
        employee: {
          date_of_joining: '2024-05-01'
        }
      };

      const result = payrollService.calculatePayrollPreview(profile, 4, 2024);
      
      expect(result.grossPay).toBe(0);
    });
  });
});
