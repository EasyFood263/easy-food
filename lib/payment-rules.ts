export const EASY_FOOD_PAYMENT = {
  ownerName: 'Omar Farooq',
  easyPaisa: { accountTitle: 'Omar Farooq', number: '92370283429' },
  jazzCash: { accountTitle: 'Omar Farooq', number: '92370283429' },
  riderDailyFee: 50,
  restaurantCommissionRate: 0.025,
  platformRate: (subtotal: number) => subtotal <= 3000 ? 0.03 : 0.06,
  deliveryRate: (distanceKm: number) => distanceKm <= 4 ? 0.04 : 0.08,
  settlement: 'daily',
} as const;

export type PaymentProof = {
  method: 'easypaisa' | 'jazzcash';
  transactionReference: string;
  amount: number;
  screenshotUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
};

export function calculateOrderCharges(subtotal: number, distanceKm: number) {
  const platformRate = EASY_FOOD_PAYMENT.platformRate(subtotal);
  const deliveryRate = EASY_FOOD_PAYMENT.deliveryRate(distanceKm);
  return {
    platformCharge: subtotal * platformRate,
    restaurantCommission: subtotal * EASY_FOOD_PAYMENT.restaurantCommissionRate,
    deliveryCharge: subtotal * deliveryRate,
    platformRate,
    deliveryRate,
  };
}
