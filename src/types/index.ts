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

/** 已保存的配方 */
export interface Recipe {
  id: string;
  name: string;
  totalOilWeight: number;
  /** 超脂比例，旧数据可能缺失该字段 */
  superfatPercentage?: number;
  oils: OilRatio[];
  lyeAmount: string;
  waterAmount: string;
  createdAt: string;
}
