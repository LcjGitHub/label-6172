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
  oils: OilRatio[];
  lyeAmount: string;
  waterAmount: string;
  createdAt: string;
}
