import { TradeType } from './worker.model';

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  tradeRestriction: TradeType | null;
  maxTotalUses: number | null;
  usedCount: number;
  usedByUserIds: string[];
  expiryDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponDto {
  code?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  tradeRestriction?: TradeType | null;
  maxTotalUses?: number | null;
  expiryDate?: string | null;
}

export interface UpdateCouponDto {
  discountType?: CouponDiscountType;
  discountValue?: number;
  tradeRestriction?: TradeType | null;
  maxTotalUses?: number | null;
  expiryDate?: string | null;
  isActive?: boolean;
}
