import Decimal from 'decimal.js';
import type { CalcResult, Oil, OilRatio } from '../types';

/** 水相比例（Mock 简化：碱量的 2.5 倍） */
const WATER_RATIO = new Decimal('2.5');

/**
 * 校验油脂比例合计是否为 100%
 * @param oils - 油脂配比列表
 */
export function validatePercentageSum(oils: OilRatio[]): boolean {
  const sum = oils.reduce(
    (acc, item) => acc.plus(new Decimal(item.percentage || 0)),
    new Decimal(0),
  );
  return sum.equals(100);
}

/**
 * 计算当前比例合计
 * @param oils - 油脂配比列表
 */
export function sumPercentages(oils: OilRatio[]): Decimal {
  return oils.reduce(
    (acc, item) => acc.plus(new Decimal(item.percentage || 0)),
    new Decimal(0),
  );
}

/**
 * 按 Mock 皂化值计算碱量
 * 公式：碱量(g) = Σ(油脂重量 × 皂化值)，油脂重量 = 总油重 × 比例%
 * @param totalOilWeight - 总油脂重量（g）
 * @param oils - 油脂配比
 * @param oilMap - 油脂字典
 */
export function calculateLye(
  totalOilWeight: number,
  oils: OilRatio[],
  oilMap: Map<string, Oil>,
): CalcResult {
  const total = new Decimal(totalOilWeight);
  let totalLye = new Decimal(0);

  const oilDetails = oils.map((item) => {
    const oil = oilMap.get(item.oilId);
    const pct = new Decimal(item.percentage);
    const weight = total.mul(pct).div(100);
    const sap = new Decimal(oil?.sapValue ?? 0);
    const lye = weight.mul(sap);
    totalLye = totalLye.plus(lye);

    return {
      oilId: item.oilId,
      oilName: oil?.name ?? item.oilId,
      percentage: pct.toFixed(2),
      weight: weight.toFixed(2),
      lye: lye.toFixed(3),
    };
  });

  const waterAmount = totalLye.mul(WATER_RATIO);

  return {
    totalOilWeight: total.toFixed(2),
    lyeAmount: totalLye.toFixed(3),
    waterAmount: waterAmount.toFixed(2),
    oilDetails,
  };
}

/**
 * 将油脂列表转为 Map 便于查找
 * @param oils - 油脂列表
 */
export function buildOilMap(oils: Oil[]): Map<string, Oil> {
  return new Map(oils.map((oil) => [oil.id, oil]));
}
