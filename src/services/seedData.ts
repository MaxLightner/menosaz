import { Business, Category } from '../types';

export const INITIAL_BUSINESS: Business = {
  id: 'pich-shemroon',
  name: 'رستوران پیچ شمرون',
  slug: 'pich-shemroon',
  branchName: 'شعبه شمرون • تجریش',
  branchCode: '۲۰۱',
  phone: '۰۲۱-۲۲۷۴۵۵۶۰',
  address: 'تهران، شمیرانات، میدان تجریش، خیابان باهنر (نیاوران)، پلاک ۱۲۸',
  orderAcceptanceActive: true,
  activeTemplate: 'traditional',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-kebab', name: 'کباب‌های شمرونی', icon: 'kebab_dining', sortOrder: 1 },
  { id: 'cat-traditional', name: 'غذاهای اصیل ایرانی', icon: 'rice_bowl', sortOrder: 2 },
  { id: 'cat-fastfood', name: 'پیتزا و برگر', icon: 'local_pizza', sortOrder: 3 },
  { id: 'cat-appetizer', name: 'پیش‌غذا و سالاد', icon: 'lunch_dining', sortOrder: 4 },
  { id: 'cat-drink', name: 'نوشیدنی‌ها', icon: 'local_drink', sortOrder: 5 },
  { id: 'cat-cafe', name: 'کافه و دسر', icon: 'coffee', sortOrder: 6 },
];

