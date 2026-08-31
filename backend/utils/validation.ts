/**
 * Input Validation Utilities
 */

import { CATEGORIES, PAYMENT_METHODS, INCOME_SOURCES } from './helpers.js';

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
}

export function validateAmount(amount: any): { isValid: boolean; parsed: number; message?: string } {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, parsed: 0, message: 'Amount must be a positive number' };
  }
  return { isValid: true, parsed: Number(num.toFixed(2)) };
}

export function validateDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function validateCategory(category: string): boolean {
  return CATEGORIES.includes(category);
}

export function validatePaymentMethod(method: string): boolean {
  return PAYMENT_METHODS.includes(method);
}

export function validateIncomeSource(source: string): boolean {
  return INCOME_SOURCES.includes(source);
}
