export const APP_VERSION = '1.5.0';

export type Product = { id: string; name: string; price: number };

export type Address = { city: string; pincode: string };

export type User = { id: string; name: string; address?: Address };

export const PRODUCTS: Product[] = [
  { id: 'coffee', name: 'Filter coffee, 250 g', price: 320 },
  { id: 'mug', name: 'Steel tumbler set', price: 540 },
  { id: 'kettle', name: 'Pour-over kettle', price: 1450 },
];

const DELIVERY_DAYS: Record<string, number> = { Chennai: 1, Bengaluru: 2, Mumbai: 3 };

export function deliveryEstimate(address: Address): string {
  const days = DELIVERY_DAYS[address.city] ?? 5;
  return `Arrives in ${days} day${days === 1 ? '' : 's'} (${address.city})`;
}

export const USERS: Record<string, User> = {
  member: {
    id: 'member',
    name: 'Asha (member)',
    address: { city: 'Chennai', pincode: '600017' },
  },
  guest: { id: 'guest', name: 'Guest' },
};
