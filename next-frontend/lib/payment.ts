/** UI-only provider catalog. No credentials, PAN, CVC or payment tokens are collected. */
export type PaymentProviderId =
  | "toss_pay"
  | "kakao_pay"
  | "naver_pay"
  | "payco"
  | "card";
export type PaymentProvider = {
  id: PaymentProviderId;
  label: string;
  caption: string;
  shortLabel: string;
  integrationStatus: "planned";
};

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] = [
  {
    id: "toss_pay",
    label: "토스페이",
    shortLabel: "T",
    caption: "토스 간편결제",
    integrationStatus: "planned",
  },
  {
    id: "kakao_pay",
    label: "카카오페이",
    shortLabel: "K",
    caption: "카카오 간편결제",
    integrationStatus: "planned",
  },
  {
    id: "naver_pay",
    label: "네이버페이",
    shortLabel: "N",
    caption: "네이버 간편결제",
    integrationStatus: "planned",
  },
  {
    id: "payco",
    label: "PAYCO",
    shortLabel: "P",
    caption: "페이코 간편결제",
    integrationStatus: "planned",
  },
  {
    id: "card",
    label: "신용·체크카드",
    shortLabel: "CARD",
    caption: "PG 결제창 연동 예정",
    integrationStatus: "planned",
  },
];

/** Future adapter contract; implement only after provider approval and merchant onboarding. */
export type CheckoutRequest = {
  reservationId: string;
  provider: PaymentProviderId;
  userApproved: boolean;
};
export type CheckoutResult =
  | { status: "confirmed"; bookingReference: string; providerReference: string }
  | { status: "pending"; requestId: string }
  | { status: "failed"; reason: string };

export interface PaymentAdapter {
  prepareCheckout(request: CheckoutRequest): Promise<{ approvalUrl: string }>;
  verifyProviderResult(providerReference: string): Promise<CheckoutResult>;
}
