"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  detectNetwork,
  formatPhoneDisplay,
  sanitizeNgPhoneInput,
  toLocalPhone,
  type NetworkCode,
} from "@/lib/phone";
import { formatNaira } from "@/lib/money";

export type Plan = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  validityDays: number;
  retailPrice: number;
  resellerPrice: number;
  networkCode: NetworkCode;
};

export type Beneficiary = {
  id: string;
  label: string;
  phone: string | null;
  networkCode: string | null;
};

export type TypeFilter = "ALL" | "SME" | "GIFTING" | "RETAIL";

export function useBuyData() {
  const router = useRouter();
  const [phone, setPhoneRaw] = useState("");
  const setPhone = (value: string) => setPhoneRaw(sanitizeNgPhoneInput(value));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [balance, setBalance] = useState<number | null>(null);
  const [hasPin, setHasPin] = useState(true);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "delivered" | "failed">("idle");
  const [trail, setTrail] = useState<{ at: string; status: string; note?: string }[]>([]);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [ussdHint, setUssdHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const network = detectNetwork(phone);
  const local = toLocalPhone(phone);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog/plans").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/auth/pin").then((r) => r.json()),
      fetch("/api/beneficiaries?service=DATA").then((r) => r.json()),
    ])
      .then(([p, w, pinRes, b]) => {
        setPlans(p.plans || []);
        if (w.balance != null) setBalance(w.balance);
        setHasPin(pinRes.hasPin !== false);
        setBeneficiaries(b.beneficiaries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = plans;
    if (network) list = list.filter((p) => p.networkCode === network);
    if (typeFilter !== "ALL") list = list.filter((p) => p.type === typeFilter);
    return list;
  }, [plans, network, typeFilter]);

  function openConfirm() {
    setError(null);
    if (!local) {
      setError("Enter a valid Nigerian number");
      return;
    }
    if (!selected) {
      setError("Select a plan");
      return;
    }
    if (!hasPin) {
      setError("Set a transaction PIN in Settings first");
      return;
    }
    if (balance != null && balance < selected.retailPrice) {
      setError(`Insufficient balance. Fund wallet (have ${formatNaira(balance)})`);
      return;
    }
    setPin("");
    setTrail([]);
    setStatus("idle");
    setOrderRef(null);
    setOpen(true);
  }

  function pay() {
    if (!selected || !local || pin.length < 4) return;
    start(async () => {
      setStatus("processing");
      setError(null);
      setTrail([
        { at: new Date().toISOString(), status: "PENDING", note: "Submitting" },
        { at: new Date().toISOString(), status: "PROCESSING", note: "Debiting wallet" },
      ]);
      const res = await fetch("/api/vtu/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: local,
          planId: selected.id,
          networkCode: network,
          pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("failed");
        setError(data.error || "Purchase failed");
        if (data.transaction?.statusTrail) setTrail(data.transaction.statusTrail);
        if (data.balance != null) setBalance(data.balance);
        if (data.code === "PIN_REQUIRED") setHasPin(false);
        return;
      }
      setOrderRef(data.transaction.orderRef);
      setTrail(data.transaction.statusTrail || []);
      setUssdHint(data.ussdHint || null);
      if (data.balance != null) setBalance(data.balance);
      setStatus("delivered");
      fetch("/api/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: local,
          label: formatPhoneDisplay(local),
          service: "DATA",
          networkCode: network,
        }),
      }).catch(() => {});
      router.refresh();
    });
  }

  function closeSheet() {
    if (status !== "processing") setOpen(false);
  }

  function goToReceipt() {
    setOpen(false);
    if (orderRef) router.push(`/history/${orderRef}`);
  }

  return {
    phone,
    setPhone,
    plans,
    beneficiaries,
    selected,
    setSelected,
    typeFilter,
    setTypeFilter,
    balance,
    hasPin,
    pin,
    setPin,
    open,
    status,
    trail,
    orderRef,
    ussdHint,
    error,
    loading,
    pending,
    network,
    local,
    filtered,
    openConfirm,
    pay,
    closeSheet,
    goToReceipt,
  };
}

export type BuyDataState = ReturnType<typeof useBuyData>;
