import { z } from 'zod';

/** 单条油脂配比校验 */
export const oilRatioSchema = z.object({
  oilId: z.string().min(1, '请选择油脂'),
  percentage: z
    .number({ invalid_type_error: '请输入比例' })
    .min(0.01, '比例须大于 0')
    .max(100, '单项比例不能超过 100'),
});

/** 计算器表单校验 */
export const calcFormSchema = z
  .object({
    recipeName: z.string().optional(),
    totalOilWeight: z
      .number({ invalid_type_error: '请输入总油重' })
      .min(1, '总油重须大于 0'),
    oils: z.array(oilRatioSchema).min(1, '至少选择一种油脂'),
  })
  .superRefine((data, ctx) => {
    const sum = data.oils.reduce((acc, o) => acc + o.percentage, 0);
    if (Math.abs(sum - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `油脂比例合计须为 100%，当前为 ${sum.toFixed(2)}%`,
        path: ['oils'],
      });
    }

    const ids = data.oils.map((o) => o.oilId);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '不能重复选择同一种油脂',
        path: ['oils'],
      });
    }
  });

export type CalcFormValues = z.infer<typeof calcFormSchema>;
