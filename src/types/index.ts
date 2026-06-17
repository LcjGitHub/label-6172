/** 碱类型 */
export type AlkaliType = 'NaOH' | 'KOH';

/** 氢氧化钾折算系数：KOH 用量 = NaOH 用量 × 0.7 */
export const KOH_CONVERSION_FACTOR = 0.7;

/** Mock 油脂定义 */
export interface Oil {
  id: string;
  name: string;
  /** 皂化值（g NaOH / g 油脂） */
  sapValue: number;
}

/** 配方中的油脂配比项 */
export interface OilRatio {
  oilId: string;
  percentage: number;
}

/** 计算结果 */
export interface CalcResult {
  /** 碱类型 */
  alkaliType: AlkaliType;
  totalOilWeight: string;
  /** 扣减前碱量（按皂化值算出的原始碱量） */
  lyeBeforeSuperfat: string;
  /** 超脂扣减量 */
  superfatDeduction: string;
  /** 扣减后碱量（最终碱量） */
  lyeAmount: string;
  waterAmount: string;
  oilDetails: Array<{
    oilId: string;
    oilName: string;
    percentage: string;
    weight: string;
    lye: string;
  }>;
}

/** 批量换算结果 */
export interface BatchCalcResult {
  /** 碱类型 */
  alkaliType: AlkaliType;
  /** 换算比例系数 */
  scaleFactor: string;
  /** 当前配方成品总重 (g) */
  currentTotalWeight: string;
  /** 目标成品总重 (g) */
  targetTotalWeight: string;
  /** 单块成品重量 (g) */
  singleBlockWeight: string;
  /** 计划制作块数 */
  batchCount: number;
  /** 批量总油重 (g) */
  totalOilWeight: string;
  /** 批量扣减前碱量 (g) */
  lyeBeforeSuperfat: string;
  /** 批量超脂扣减量 (g) */
  superfatDeduction: string;
  /** 批量扣减后碱量 (g) */
  lyeAmount: string;
  /** 批量建议水量 (g) */
  waterAmount: string;
  /** 批量油脂明细 */
  oilDetails: Array<{
    oilId: string;
    oilName: string;
    percentage: string;
    weight: string;
    lye: string;
  }>;
}

/** 已保存的配方 */
export interface Recipe {
  id: string;
  name: string;
  totalOilWeight: number;
  /** 超脂比例，旧数据可能缺失该字段 */
  superfatPercentage?: number;
  /** 碱类型，旧数据可能缺失该字段，默认为 NaOH */
  alkaliType?: AlkaliType;
  oils: OilRatio[];
  lyeAmount: string;
  waterAmount: string;
  createdAt: string;
}
