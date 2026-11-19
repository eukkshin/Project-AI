"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Info,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { PAYMENT_PROVIDERS, PaymentProviderId } from "@/lib/payment";

export default function PaymentsView() {
  const [selected, setSelected] = useState<PaymentProviderId>("toss_pay");
  const current = PAYMENT_PROVIDERS.find(
    (provider) => provider.id === selected,
  );

  return (
    <main className="content-view payment-view">
      <span className="eyebrow">PAYMENT & RESERVATION</span>
      <div className="page-title-row">
        <div>
          <h1>예약 및 결제</h1>
          <p>
            예약을 AI가 준비하고, 결제가 필요한 경우 직접 확인하도록
            설계했습니다.
          </p>
        </div>
      </div>
      <div className="payment-notice" role="status">
        <Info size={18} aria-hidden="true" />
        <p>
          <strong>결제 연동 준비 중</strong>
          <span>
            현재 화면은 디자인 및 결제수단 선택 미리보기입니다. 카드 등록, 계좌
            연결, 예약 신청, 결제 및 금액 청구는 이루어지지 않습니다.
          </span>
        </p>
      </div>
      <div className="payment-columns">
        <section
          className="payment-section"
          aria-labelledby="payment-method-heading"
        >
          <div className="payment-section-heading">
            <Wallet size={20} />
            <div>
              <h2 id="payment-method-heading">결제수단 선택</h2>
              <p>이용 가능한 결제수단은 제휴·PG 계약 후 활성화됩니다.</p>
            </div>
          </div>
          <div
            className="payment-provider-list"
            role="radiogroup"
            aria-label="결제수단 미리보기"
          >
            {PAYMENT_PROVIDERS.map((provider) => (
              <label
                className={`payment-provider ${selected === provider.id ? "is-selected" : ""}`}
                key={provider.id}
              >
                <input
                  type="radio"
                  name="payment-provider"
                  value={provider.id}
                  checked={selected === provider.id}
                  onChange={() => setSelected(provider.id)}
                />
                <span
                  className={`payment-provider-logo payment-provider-${provider.id}`}
                  aria-hidden="true"
                >
                  {provider.shortLabel}
                </span>
                <span className="payment-provider-copy">
                  <strong>{provider.label}</strong>
                  <small>{provider.caption}</small>
                </span>
                <span className="payment-planned">연동 예정</span>
                <span className="payment-radio-indicator" aria-hidden="true">
                  {selected === provider.id && <Check size={13} />}
                </span>
              </label>
            ))}
          </div>
          <p className="payment-footnote">
            <LockKeyhole size={14} /> 결제수단 선택은 화면 안에서만 유지되며
            카드 정보나 결제 인증정보는 수집·저장하지 않습니다.
          </p>
        </section>
        <section
          className="payment-section"
          aria-labelledby="booking-preview-heading"
        >
          <div className="payment-section-heading">
            <CalendarDays size={20} />
            <div>
              <h2 id="booking-preview-heading">예약 승인 화면 미리보기</h2>
              <p>실제 예약 연결 후 이 위치에 확인 내역이 표시됩니다.</p>
            </div>
          </div>
          <div className="payment-reservation-empty">
            <CalendarDays size={26} />
            <strong>선택된 예약이 없습니다.</strong>
            <p>
              나중에 AI가 확인한 식당·방문 시간·인원·예약금을 여기에 보여줍니다.
              확인된 예약 데이터가 없으므로 임의의 예약 내역은 표시하지
              않습니다.
            </p>
          </div>
          <div className="payment-summary-line">
            <span>선택한 결제수단</span>
            <strong>
              {current?.label || "-"} <small>· 미연동</small>
            </strong>
          </div>
          <div className="payment-summary-line">
            <span>예약금 및 취소 규정</span>
            <strong>확인된 정보 없음</strong>
          </div>
          <button
            className="payment-submit"
            type="button"
            disabled
            aria-disabled="true"
          >
            예약·결제 기능 준비 중 <ArrowRight size={17} />
          </button>
          <p className="payment-footnote">
            <ShieldCheck size={15} /> 실제 예약·결제는 서비스 연동 및 사용자
            최종 승인이 구현된 후에만 가능합니다.
          </p>
        </section>
      </div>
      <section
        className="payment-next-step"
        aria-labelledby="future-steps-heading"
      >
        <div>
          <CreditCard size={19} />
          <h2 id="future-steps-heading">추후 연동 방식</h2>
        </div>
        <p>
          ① 식당 예약 가능 여부 확인 → ② 예약 조건·예약금·취소 정책 표시 → ③
          사용자 최종 승인 → ④ 공식 예약 API 및 PG 결제창 → ⑤ 서버에서 결과
          검증. 결제번호만 보고 예약 확정으로 판단하지 않습니다.
        </p>
      </section>
    </main>
  );
}
