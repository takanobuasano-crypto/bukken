import type { PropertyData, InitialCostBreakdown, InitialCostItem } from "./types";
import { DEFAULT_COSTS } from "./constants";

export function calculateInitialCosts(property: PropertyData): InitialCostBreakdown {
  const { rent, managementFee, deposit, keyMoney } = property;
  const items: InitialCostItem[] = [];

  // 確定項目
  items.push({
    label: "前家賃（1ヶ月分）",
    amount: rent,
    isEstimate: false,
  });

  if (managementFee > 0) {
    items.push({
      label: "前管理費・共益費（1ヶ月分）",
      amount: managementFee,
      isEstimate: false,
    });
  }

  items.push({
    label: "敷金",
    amount: deposit,
    isEstimate: false,
    note: deposit === 0 ? "なし" : undefined,
  });

  items.push({
    label: "礼金",
    amount: keyMoney,
    isEstimate: false,
    note: keyMoney === 0 ? "なし" : undefined,
  });

  // 推定項目
  const brokerageFee = Math.round(rent * DEFAULT_COSTS.brokerageFeeRate);
  items.push({
    label: "仲介手数料",
    amount: brokerageFee,
    isEstimate: true,
    note: "家賃×1.1（税込）",
  });

  const guaranteeFee = Math.round(rent * DEFAULT_COSTS.guaranteeFeeRate);
  items.push({
    label: "保証会社利用料",
    amount: guaranteeFee,
    isEstimate: true,
    note: "家賃×0.5",
  });

  items.push({
    label: "火災保険料（2年）",
    amount: DEFAULT_COSTS.fireInsurance,
    isEstimate: true,
  });

  items.push({
    label: "鍵交換費用",
    amount: DEFAULT_COSTS.keyExchange,
    isEstimate: true,
  });

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const estimatedTotal = items
    .filter((item) => item.isEstimate)
    .reduce((sum, item) => sum + item.amount, 0);

  return { items, total, estimatedTotal };
}
