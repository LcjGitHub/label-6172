import { describe, it, expect } from 'vitest';
import {
  validatePercentageSum,
  sumPercentages,
  calculateLye,
  evenlyDistributePercentages,
  calculateBatch,
  getAlkaliLabel,
  getAlkaliSuffix,
  buildOilMap,
} from '../calc';
import type { Oil, OilRatio, CalcResult } from '../../types';
import { KOH_CONVERSION_FACTOR } from '../../types';

const mockOils: Oil[] = [
  { id: 'olive', name: '橄榄油', sapValue: 0.135 },
  { id: 'coconut', name: '椰子油', sapValue: 0.183 },
  { id: 'palm', name: '棕榈油', sapValue: 0.142 },
  { id: 'shea', name: '乳木果油', sapValue: 0.128 },
];

const oilMap = buildOilMap(mockOils);

describe('碱量计算库核心函数测试', () => {
  describe('getAlkaliLabel', () => {
    it('应返回氢氧化钠中文名称', () => {
      expect(getAlkaliLabel('NaOH')).toBe('氢氧化钠');
    });

    it('应返回氢氧化钾中文名称', () => {
      expect(getAlkaliLabel('KOH')).toBe('氢氧化钾');
    });

    it('undefined 应默认返回氢氧化钠', () => {
      expect(getAlkaliLabel(undefined)).toBe('氢氧化钠');
    });
  });

  describe('getAlkaliSuffix', () => {
    it('NaOH 应返回正确后缀', () => {
      expect(getAlkaliSuffix('NaOH')).toBe('克 氢氧化钠');
    });

    it('KOH 应返回正确后缀', () => {
      expect(getAlkaliSuffix('KOH')).toBe('克 氢氧化钾');
    });
  });

  describe('buildOilMap', () => {
    it('应正确构建油脂 Map', () => {
      const map = buildOilMap(mockOils);
      expect(map.get('olive')?.name).toBe('橄榄油');
      expect(map.get('coconut')?.sapValue).toBe(0.183);
      expect(map.size).toBe(4);
    });

    it('空数组应返回空 Map', () => {
      const map = buildOilMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('validatePercentageSum - 比例合计校验', () => {
    it('正常场景：合计恰好为 100% 应返回 true', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 50 },
        { oilId: 'coconut', percentage: 30 },
        { oilId: 'palm', percentage: 20 },
      ];
      expect(validatePercentageSum(oils)).toBe(true);
    });

    it('边界场景：单种油脂 100% 应返回 true', () => {
      const oils: OilRatio[] = [{ oilId: 'olive', percentage: 100 }];
      expect(validatePercentageSum(oils)).toBe(true);
    });

    it('边界场景：多种小数比例合计 100% 应返回 true', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 33.33 },
        { oilId: 'coconut', percentage: 33.33 },
        { oilId: 'palm', percentage: 33.34 },
      ];
      expect(validatePercentageSum(oils)).toBe(true);
    });

    it('无效输入：合计小于 100% 应返回 false', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 50 },
        { oilId: 'coconut', percentage: 30 },
      ];
      expect(validatePercentageSum(oils)).toBe(false);
    });

    it('无效输入：合计大于 100% 应返回 false', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 60 },
        { oilId: 'coconut', percentage: 50 },
      ];
      expect(validatePercentageSum(oils)).toBe(false);
    });

    it('边界场景：包含 0% 比例项，合计 100% 应返回 true', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 70 },
        { oilId: 'coconut', percentage: 30 },
        { oilId: 'palm', percentage: 0 },
      ];
      expect(validatePercentageSum(oils)).toBe(true);
    });

    it('无效输入：空数组合计为 0，应返回 false', () => {
      expect(validatePercentageSum([])).toBe(false);
    });

    it('边界场景：含 undefined 比例视为 0', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 100 },
        { oilId: 'coconut', percentage: undefined as unknown as number },
      ];
      expect(validatePercentageSum(oils)).toBe(true);
    });
  });

  describe('sumPercentages - 计算比例合计', () => {
    it('应正确计算多种油脂比例合计', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 50 },
        { oilId: 'coconut', percentage: 30 },
        { oilId: 'palm', percentage: 20 },
      ];
      expect(sumPercentages(oils).equals(100)).toBe(true);
    });

    it('空数组应返回 0', () => {
      expect(sumPercentages([]).equals(0)).toBe(true);
    });

    it('小数比例应正确计算', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 33.33 },
        { oilId: 'coconut', percentage: 33.33 },
        { oilId: 'palm', percentage: 33.34 },
      ];
      expect(sumPercentages(oils).equals(100)).toBe(true);
    });
  });

  describe('calculateLye - 碱量计算（含超脂扣减和 KOH 折算）', () => {
    const standardOils: OilRatio[] = [
      { oilId: 'olive', percentage: 50 },
      { oilId: 'coconut', percentage: 30 },
      { oilId: 'palm', percentage: 20 },
    ];

    it('正常场景：无超脂 NaOH 计算正确', () => {
      const result = calculateLye(1000, standardOils, oilMap, 0, 'NaOH');

      const oliveWeight = 1000 * 0.5;
      const coconutWeight = 1000 * 0.3;
      const palmWeight = 1000 * 0.2;
      const expectedLye =
        oliveWeight * 0.135 + coconutWeight * 0.183 + palmWeight * 0.142;

      expect(result.alkaliType).toBe('NaOH');
      expect(result.totalOilWeight).toBe('1000.00');
      expect(parseFloat(result.lyeBeforeSuperfat)).toBeCloseTo(expectedLye, 3);
      expect(parseFloat(result.superfatDeduction)).toBeCloseTo(0, 3);
      expect(parseFloat(result.lyeAmount)).toBeCloseTo(expectedLye, 3);
      expect(result.oilDetails).toHaveLength(3);
      expect(result.oilDetails[0].oilName).toBe('橄榄油');
    });

    it('超脂扣减：5% 超脂应正确扣减碱量', () => {
      const result = calculateLye(1000, standardOils, oilMap, 5, 'NaOH');

      const lyeBefore = parseFloat(result.lyeBeforeSuperfat);
      const deduction = parseFloat(result.superfatDeduction);
      const finalLye = parseFloat(result.lyeAmount);

      expect(deduction).toBeCloseTo(lyeBefore * 0.05, 3);
      expect(finalLye).toBeCloseTo(lyeBefore * 0.95, 3);
      expect(finalLye).toBeCloseTo(lyeBefore - deduction, 3);
    });

    it('零超脂：超脂为 0 时扣减量应为 0', () => {
      const result = calculateLye(1000, standardOils, oilMap, 0, 'NaOH');

      expect(parseFloat(result.superfatDeduction)).toBeCloseTo(0, 3);
      expect(parseFloat(result.lyeAmount)).toBeCloseTo(
        parseFloat(result.lyeBeforeSuperfat),
        3,
      );
    });

    it('最大超脂：20% 超脂应正确计算', () => {
      const result = calculateLye(1000, standardOils, oilMap, 20, 'NaOH');

      const lyeBefore = parseFloat(result.lyeBeforeSuperfat);
      const finalLye = parseFloat(result.lyeAmount);

      expect(finalLye).toBeCloseTo(lyeBefore * 0.8, 3);
    });

    it('KOH 折算：KOH 碱量应为 NaOH 的 0.7 倍', () => {
      const naohResult = calculateLye(1000, standardOils, oilMap, 0, 'NaOH');
      const kohResult = calculateLye(1000, standardOils, oilMap, 0, 'KOH');

      const naohLye = parseFloat(naohResult.lyeAmount);
      const kohLye = parseFloat(kohResult.lyeAmount);

      expect(kohResult.alkaliType).toBe('KOH');
      expect(kohLye).toBeCloseTo(naohLye * KOH_CONVERSION_FACTOR, 3);
    });

    it('KOH 折算 + 超脂扣减组合场景', () => {
      const naohResult = calculateLye(1000, standardOils, oilMap, 5, 'NaOH');
      const kohResult = calculateLye(1000, standardOils, oilMap, 5, 'KOH');

      const naohLye = parseFloat(naohResult.lyeAmount);
      const kohLye = parseFloat(kohResult.lyeAmount);

      expect(kohLye).toBeCloseTo(naohLye * KOH_CONVERSION_FACTOR, 3);
    });

    it('默认参数：未指定碱类型默认为 NaOH', () => {
      const result = calculateLye(1000, standardOils, oilMap);
      expect(result.alkaliType).toBe('NaOH');
    });

    it('默认参数：未指定超脂默认为 0', () => {
      const result = calculateLye(1000, standardOils, oilMap, undefined as unknown as number);
      expect(parseFloat(result.superfatDeduction)).toBeCloseTo(0, 3);
    });

    it('水量计算：水量应为碱量的 2.5 倍', () => {
      const result = calculateLye(1000, standardOils, oilMap, 5, 'NaOH');
      const lyeAmount = parseFloat(result.lyeAmount);
      const waterAmount = parseFloat(result.waterAmount);

      expect(waterAmount).toBeCloseTo(lyeAmount * 2.5, 2);
    });

    it('单种油脂 100% 计算正确', () => {
      const oils: OilRatio[] = [{ oilId: 'olive', percentage: 100 }];
      const result = calculateLye(500, oils, oilMap, 0, 'NaOH');

      const expectedLye = 500 * 0.135;
      expect(parseFloat(result.lyeAmount)).toBeCloseTo(expectedLye, 3);
      expect(result.oilDetails[0].weight).toBe('500.00');
    });

    it('小数比例计算正确', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 33.33 },
        { oilId: 'coconut', percentage: 33.33 },
        { oilId: 'palm', percentage: 33.34 },
      ];
      const result = calculateLye(1000, oils, oilMap, 0, 'NaOH');

      expect(result.oilDetails[0].weight).toBe('333.30');
      expect(result.oilDetails[1].weight).toBe('333.30');
      expect(result.oilDetails[2].weight).toBe('333.40');
      expect(parseFloat(result.totalOilWeight)).toBeCloseTo(1000, 2);
    });

    it('未知油脂 ID 应使用默认值 0', () => {
      const oils: OilRatio[] = [
        { oilId: 'unknown-oil', percentage: 100 },
      ];
      const result = calculateLye(1000, oils, oilMap, 0, 'NaOH');

      expect(parseFloat(result.lyeAmount)).toBeCloseTo(0, 3);
      expect(result.oilDetails[0].oilName).toBe('unknown-oil');
    });

    it('油脂明细应正确计算各项碱量', () => {
      const result = calculateLye(1000, standardOils, oilMap, 0, 'NaOH');

      expect(result.oilDetails[0].percentage).toBe('50.00');
      expect(result.oilDetails[0].weight).toBe('500.00');
      expect(parseFloat(result.oilDetails[0].lye)).toBeCloseTo(500 * 0.135, 3);

      expect(result.oilDetails[1].percentage).toBe('30.00');
      expect(result.oilDetails[1].weight).toBe('300.00');
      expect(parseFloat(result.oilDetails[1].lye)).toBeCloseTo(300 * 0.183, 3);

      expect(result.oilDetails[2].percentage).toBe('20.00');
      expect(result.oilDetails[2].weight).toBe('200.00');
      expect(parseFloat(result.oilDetails[2].lye)).toBeCloseTo(200 * 0.142, 3);
    });
  });

  describe('evenlyDistributePercentages - 比例均分', () => {
    it('2 种油脂应各占 50%', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 0 },
        { oilId: 'coconut', percentage: 0 },
      ];
      const result = evenlyDistributePercentages(oils);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
      expect(result[0].oilId).toBe('olive');
      expect(result[1].oilId).toBe('coconut');
      expect(validatePercentageSum(result)).toBe(true);
    });

    it('3 种油脂应正确均分并补齐末项', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 0 },
        { oilId: 'coconut', percentage: 0 },
        { oilId: 'palm', percentage: 0 },
      ];
      const result = evenlyDistributePercentages(oils);

      expect(result).toHaveLength(3);
      expect(result[0].percentage).toBe(33.33);
      expect(result[1].percentage).toBe(33.33);
      expect(result[2].percentage).toBe(33.34);
      expect(validatePercentageSum(result)).toBe(true);
    });

    it('4 种油脂应各占 25%', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 0 },
        { oilId: 'coconut', percentage: 0 },
        { oilId: 'palm', percentage: 0 },
        { oilId: 'shea', percentage: 0 },
      ];
      const result = evenlyDistributePercentages(oils);

      expect(result).toHaveLength(4);
      expect(result[0].percentage).toBe(25);
      expect(result[1].percentage).toBe(25);
      expect(result[2].percentage).toBe(25);
      expect(result[3].percentage).toBe(25);
      expect(validatePercentageSum(result)).toBe(true);
    });

    it('少于 2 种油脂应直接返回', () => {
      const single: OilRatio[] = [{ oilId: 'olive', percentage: 100 }];
      expect(evenlyDistributePercentages(single)).toEqual(single);

      const empty: OilRatio[] = [];
      expect(evenlyDistributePercentages(empty)).toEqual(empty);
    });

    it('null 或 undefined 输入应返回空数组', () => {
      expect(evenlyDistributePercentages(null as unknown as OilRatio[])).toEqual([]);
      expect(evenlyDistributePercentages(undefined as unknown as OilRatio[])).toEqual([]);
    });

    it('6 种油脂均分应正确处理余数', () => {
      const oils: OilRatio[] = Array.from({ length: 6 }, (_, i) => ({
        oilId: `oil-${i}`,
        percentage: 0,
      }));
      const result = evenlyDistributePercentages(oils);

      expect(result).toHaveLength(6);
      expect(result[0].percentage).toBe(16.66);
      expect(result[1].percentage).toBe(16.66);
      expect(result[2].percentage).toBe(16.66);
      expect(result[3].percentage).toBe(16.66);
      expect(result[4].percentage).toBe(16.66);
      expect(result[5].percentage).toBe(16.7);
      expect(validatePercentageSum(result)).toBe(true);
    });

    it('不保留原始比例值，只按数量均分', () => {
      const oils: OilRatio[] = [
        { oilId: 'olive', percentage: 80 },
        { oilId: 'coconut', percentage: 20 },
      ];
      const result = evenlyDistributePercentages(oils);

      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });
  });

  describe('calculateBatch - 批量换算', () => {
    const baseOils: OilRatio[] = [
      { oilId: 'olive', percentage: 50 },
      { oilId: 'coconut', percentage: 50 },
    ];

    const createBaseResult = (): CalcResult =>
      calculateLye(1000, baseOils, oilMap, 5, 'NaOH');

    const calculateCurrentTotal = (result: CalcResult): number =>
      parseFloat(result.totalOilWeight) +
      parseFloat(result.lyeAmount) +
      parseFloat(result.waterAmount);

    it('放大倍数：10 倍批量应正确换算', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const targetSingleBlock = currentTotal * 10;
      const batchResult = calculateBatch(baseResult, targetSingleBlock, 1);

      const scaleFactor = parseFloat(batchResult.scaleFactor);
      expect(scaleFactor).toBeCloseTo(10, 6);
      expect(parseFloat(batchResult.totalOilWeight)).toBeCloseTo(
        parseFloat(baseResult.totalOilWeight) * 10,
        2,
      );
      expect(parseFloat(batchResult.lyeAmount)).toBeCloseTo(
        parseFloat(baseResult.lyeAmount) * 10,
        3,
      );
      expect(parseFloat(batchResult.waterAmount)).toBeCloseTo(
        parseFloat(baseResult.waterAmount) * 10,
        2,
      );
    });

    it('缩小倍数：0.5 倍批量应正确换算', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const targetSingleBlock = currentTotal * 0.5;
      const batchResult = calculateBatch(baseResult, targetSingleBlock, 1);

      const scaleFactor = parseFloat(batchResult.scaleFactor);
      expect(scaleFactor).toBeCloseTo(0.5, 6);
    });

    it('1 倍批量：比例系数应为 1', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const batchResult = calculateBatch(baseResult, currentTotal, 1);

      expect(parseFloat(batchResult.scaleFactor)).toBeCloseTo(1, 6);
      expect(batchResult.totalOilWeight).toBe(baseResult.totalOilWeight);
      expect(batchResult.lyeAmount).toBe(baseResult.lyeAmount);
    });

    it('目标总重为 0 时比例系数应为 0', () => {
      const baseResult = createBaseResult();
      const batchResult = calculateBatch(baseResult, 0, 10);

      expect(parseFloat(batchResult.scaleFactor)).toBe(0);
      expect(parseFloat(batchResult.totalOilWeight)).toBe(0);
    });

    it('KOH 配方批量换算应保持碱类型', () => {
      const kohResult = calculateLye(1000, baseOils, oilMap, 5, 'KOH');
      const currentTotal = calculateCurrentTotal(kohResult);
      const batchResult = calculateBatch(kohResult, currentTotal, 5);

      expect(batchResult.alkaliType).toBe('KOH');
      expect(parseFloat(batchResult.targetTotalWeight)).toBeCloseTo(currentTotal * 5, 2);
    });

    it('多块批量：单块100g，10块应正确换算', () => {
      const baseResult = createBaseResult();
      const singleBlockWeight = 100;
      const batchCount = 10;
      const batchResult = calculateBatch(baseResult, singleBlockWeight, batchCount);

      const currentTotal = calculateCurrentTotal(baseResult);
      const desiredTotal = singleBlockWeight * batchCount;
      const expectedScaleFactor = desiredTotal / currentTotal;

      expect(parseFloat(batchResult.scaleFactor)).toBeCloseTo(expectedScaleFactor, 6);
      expect(parseFloat(batchResult.targetTotalWeight)).toBeCloseTo(desiredTotal, 2);
      expect(parseFloat(batchResult.singleBlockWeight)).toBeCloseTo(singleBlockWeight, 2);
      expect(batchResult.batchCount).toBe(batchCount);
    });

    it('油脂明细应正确按比例换算', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const targetSingleBlock = currentTotal * 10;
      const batchResult = calculateBatch(baseResult, targetSingleBlock, 1);

      expect(batchResult.oilDetails).toHaveLength(2);
      expect(batchResult.oilDetails[0].percentage).toBe(baseResult.oilDetails[0].percentage);
      expect(parseFloat(batchResult.oilDetails[0].weight)).toBeCloseTo(
        parseFloat(baseResult.oilDetails[0].weight) * 10,
        2,
      );
      expect(parseFloat(batchResult.oilDetails[0].lye)).toBeCloseTo(
        parseFloat(baseResult.oilDetails[0].lye) * 10,
        3,
      );
    });

    it('零块数应正确处理', () => {
      const baseResult = createBaseResult();
      const batchResult = calculateBatch(baseResult, 100, 0);

      expect(batchResult.batchCount).toBe(0);
      expect(parseFloat(batchResult.targetTotalWeight)).toBe(0);
      expect(parseFloat(batchResult.scaleFactor)).toBe(0);
    });

    it('单块重量为 0 应正确处理', () => {
      const baseResult = createBaseResult();
      const batchResult = calculateBatch(baseResult, 0, 10);

      expect(parseFloat(batchResult.singleBlockWeight)).toBe(0);
      expect(parseFloat(batchResult.targetTotalWeight)).toBe(0);
    });

    it('批量结果字段应完整正确', () => {
      const baseResult = createBaseResult();
      const batchResult = calculateBatch(baseResult, 100, 5);

      expect(batchResult.alkaliType).toBe(baseResult.alkaliType);
      expect(batchResult.batchCount).toBe(5);
      expect(parseFloat(batchResult.singleBlockWeight)).toBeCloseTo(100, 2);
      expect(parseFloat(batchResult.targetTotalWeight)).toBeCloseTo(500, 2);
      expect(batchResult.lyeBeforeSuperfat).toBeDefined();
      expect(batchResult.superfatDeduction).toBeDefined();
    });

    it('超脂扣减量应按比例缩放', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const targetSingleBlock = currentTotal * 10;
      const batchResult = calculateBatch(baseResult, targetSingleBlock, 1);

      expect(parseFloat(batchResult.superfatDeduction)).toBeCloseTo(
        parseFloat(baseResult.superfatDeduction) * 10,
        3,
      );
    });

    it('各字段应保持一致的缩放比例', () => {
      const baseResult = createBaseResult();
      const currentTotal = calculateCurrentTotal(baseResult);
      const targetSingleBlock = currentTotal * 2.5;
      const batchResult = calculateBatch(baseResult, targetSingleBlock, 1);

      const scaleFactor = parseFloat(batchResult.scaleFactor);
      expect(scaleFactor).toBeCloseTo(2.5, 6);

      expect(parseFloat(batchResult.lyeBeforeSuperfat)).toBeCloseTo(
        parseFloat(baseResult.lyeBeforeSuperfat) * scaleFactor,
        3,
      );
      expect(parseFloat(batchResult.superfatDeduction)).toBeCloseTo(
        parseFloat(baseResult.superfatDeduction) * scaleFactor,
        3,
      );
      expect(parseFloat(batchResult.lyeAmount)).toBeCloseTo(
        parseFloat(baseResult.lyeAmount) * scaleFactor,
        3,
      );
      expect(parseFloat(batchResult.waterAmount)).toBeCloseTo(
        parseFloat(baseResult.waterAmount) * scaleFactor,
        2,
      );
      expect(parseFloat(batchResult.totalOilWeight)).toBeCloseTo(
        parseFloat(baseResult.totalOilWeight) * scaleFactor,
        2,
      );
    });
  });
});
