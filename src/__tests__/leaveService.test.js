import { describe, it, expect } from 'vitest';
import { leaveService } from '../lib/leaveService';

describe('leaveService math', () => {
  describe('calculateNewLeaveBalance', () => {
    it('correctly calculates the new balance after an accrual', () => {
      const currentBalance = 10;
      const transaction = { transaction_type: 'Accrual', amount: 2 };
      
      const newBalance = leaveService.calculateNewLeaveBalance(currentBalance, transaction);
      
      expect(newBalance).toBe(12);
    });

    it('correctly calculates the new balance after a deduction', () => {
      const currentBalance = 10;
      const transaction = { transaction_type: 'Deduction', amount: -3 };
      
      const newBalance = leaveService.calculateNewLeaveBalance(currentBalance, transaction);
      
      expect(newBalance).toBe(7);
    });

    it('correctly calculates the new balance after an adjustment (positive)', () => {
      const currentBalance = 10;
      const transaction = { transaction_type: 'Adjustment', amount: 5 };
      
      const newBalance = leaveService.calculateNewLeaveBalance(currentBalance, transaction);
      
      expect(newBalance).toBe(15);
    });

    it('correctly calculates the new balance after an adjustment (negative)', () => {
      const currentBalance = 10;
      const transaction = { transaction_type: 'Adjustment', amount: -2 };
      
      const newBalance = leaveService.calculateNewLeaveBalance(currentBalance, transaction);
      
      expect(newBalance).toBe(8);
    });

    it('handles deduction with positive amount correctly (subtracts it)', () => {
      const currentBalance = 10;
      // Sometimes UI might pass positive amount for deduction
      const transaction = { transaction_type: 'Deduction', amount: 4 };
      
      const newBalance = leaveService.calculateNewLeaveBalance(currentBalance, transaction);
      
      expect(newBalance).toBe(6);
    });
  });
});
