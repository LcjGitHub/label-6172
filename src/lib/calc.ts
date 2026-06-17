import Decimal from 'decimal.js';
import type { AlkaliType, BatchCalcResult, CalcResult, Oil, OilRatio } from '../types';
import { KOH_CONVERSION_FACTOR } from '../types';

/** 水相比例（Mock 简化：碱量的 2.5 倍） */
const WATER_RATIO = new Decimal('2.5');

/**
 * 获取碱类型的中文名称
 * @param type - 碱类型（NaOH 或 KOH），若为 undefined 则默认返回氢氧化钠
 * @returns 碱类型中文名称
 */
export function getAlkaliLabel(type: AlkaliType | undefined): string {
  return type === 'KOH' ? '氢氧化钾' : '氢氧化钠';
}

/**
 * 获取碱量展示的后缀文本（格式："克 氢氧化钠" / "克 氢氧化钾"）
 * @param type - 碱类型（NaOH 或 KOH）
 * @returns 带单位的碱类型后缀
 */
export function getAlkaliSuffix(type: AlkaliType): string {
  return `克 ${getAlkaliLabel(type)}`;
}

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
  return oils.reduce((acc, item) => acc.plus(new Decimal(item.percentage || 0)), new Decimal(0));
}

/**
 * 按 Mock 皂化值计算碱量（含超脂扣减）
 * 公式：碱量(g) = Σ(油脂重量 × 皂化值)，油脂重量 = 总油重 × 比例%
 * 超脂扣减：最终碱量 = 原始碱量 × (1 - 超脂比例%)
 * KOH 模式：KOH 用量 = NaOH 用量 × 0.7
 * @param totalOilWeight - 总油脂重量（g）
 * @param oils - 油脂配比
 * @param oilMap - 油脂字典
 * @param superfatPercentage - 超脂比例（%，0-20）
 * @param alkaliType - 碱类型（NaOH 或 KOH），默认 NaOH
 */
export function calculateLye(
  totalOilWeight: number,
  oils: OilRatio[],
  oilMap: Map<string, Oil>,
  superfatPercentage: number = 0,
  alkaliType: AlkaliType = 'NaOH',
): CalcResult {
  const total = new Decimal(totalOilWeight);
  const superfatPct = new Decimal(superfatPercentage);
  const conversionFactor =
    alkaliType === 'KOH' ? new Decimal(KOH_CONVERSION_FACTOR) : new Decimal(1);
  let totalLye = new Decimal(0);

  const oilDetails = oils.map((item) => {
    const oil = oilMap.get(item.oilId);
    const pct = new Decimal(item.percentage);
    const weight = total.mul(pct).div(100);
    const sap = new Decimal(oil?.sapValue ?? 0);
    const lye = weight.mul(sap).mul(conversionFactor);
    totalLye = totalLye.plus(lye);

    return {
      oilId: item.oilId,
      oilName: oil?.name ?? item.oilId,
      percentage: pct.toFixed(2),
      weight: weight.toFixed(2),
      lye: lye.toFixed(3),
    };
  });

  const lyeBeforeSuperfat = totalLye;
  const superfatDeduction = lyeBeforeSuperfat.mul(superfatPct).div(100);
  const finalLye = lyeBeforeSuperfat.minus(superfatDeduction);
  const waterAmount = finalLye.mul(WATER_RATIO);

  return {
    alkaliType,
    totalOilWeight: total.toFixed(2),
    lyeBeforeSuperfat: lyeBeforeSuperfat.toFixed(3),
    superfatDeduction: superfatDeduction.toFixed(3),
    lyeAmount: finalLye.toFixed(3),
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

/**
 * 将油脂比例平均分配，使合计恰好为 100%
 * 每项保留两位小数，末项用余数补齐以避免合计偏差
 * @param oils - 油脂配比列表
 */
export function evenlyDistributePercentages(oils: OilRatio[]): OilRatio[] {
  if (!oils || oils.length < 2) {
    return oils ?? [];
  }
  const n = oils.length;
  const total = new Decimal(100);
  const baseValue = total.div(n).toDecimalPlaces(2, Decimal.ROUND_FLOOR);
  const result: OilRatio[] = [];
  let accumulated = new Decimal(0);

  for (let i = 0; i < n - 1; i++) {
    result.push({
      oilId: oils[i].oilId,
      percentage: baseValue.toNumber(),
    });
    accumulated = accumulated.plus(baseValue);
  }

  const remainder = total.minus(accumulated).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  result.push({
    oilId: oils[n - 1].oilId,
    percentage: remainder.toNumber(),
  });

  return result;
}

/**
 * 按单块成品重量与计划制作块数进行批量换算
 * 根据当前配方的成品总重（油 + 碱 + 水）与目标总重（单块重量 × 块数）
 * 计算换算系数，并等比放大所有用量字段，全程使用 decimal.js 保证高精度。
 * @param calcResult - 碱量计算结果（基准配方）
 * @param singleBlockWeight - 单块成品重量（g）
 * @param batchCount - 计划制作块数
 */
export function calculateBatch(
  calcResult: CalcResult,
  singleBlockWeight: number,
  batchCount: number,
): BatchCalcResult {
  const currentTotal = new Decimal(calcResult.totalOilWeight)
    .plus(new Decimal(calcResult.lyeAmount))
    .plus(new Decimal(calcResult.waterAmount));

  const desiredTotal = new Decimal(singleBlockWeight).mul(batchCount);
  const scaleFactor = currentTotal.equals(0) ? new Decimal(0) : desiredTotal.div(currentTotal);

  const totalOilWeight = new Decimal(calcResult.totalOilWeight).mul(scaleFactor);
  const lyeBeforeSuperfat = new Decimal(calcResult.lyeBeforeSuperfat).mul(scaleFactor);
  const superfatDeduction = new Decimal(calcResult.superfatDeduction).mul(scaleFactor);
  const lyeAmount = new Decimal(calcResult.lyeAmount).mul(scaleFactor);
  const waterAmount = new Decimal(calcResult.waterAmount).mul(scaleFactor);

  const oilDetails = calcResult.oilDetails.map((item) => ({
    oilId: item.oilId,
    oilName: item.oilName,
    percentage: item.percentage,
    weight: new Decimal(item.weight).mul(scaleFactor).toFixed(2),
    lye: new Decimal(item.lye).mul(scaleFactor).toFixed(3),
  }));

  return {
    alkaliType: calcResult.alkaliType,
    scaleFactor: scaleFactor.toFixed(6),
    currentTotalWeight: currentTotal.toFixed(2),
    targetTotalWeight: desiredTotal.toFixed(2),
    singleBlockWeight: new Decimal(singleBlockWeight).toFixed(2),
    batchCount,
    totalOilWeight: totalOilWeight.toFixed(2),
    lyeBeforeSuperfat: lyeBeforeSuperfat.toFixed(3),
    superfatDeduction: superfatDeduction.toFixed(3),
    lyeAmount: lyeAmount.toFixed(3),
    waterAmount: waterAmount.toFixed(2),
    oilDetails,
  };
}
