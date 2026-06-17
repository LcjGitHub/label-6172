import { z } from 'zod';

/** 碱类型校验 */
const alkaliTypeSchema = z.enum(['NaOH', 'KOH']);

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
    alkaliType: alkaliTypeSchema.default('NaOH'),
    recipeName: z.string().optional(),
    recipeNotes: z.string().max(500, '备注不能超过 500 字').optional(),
    totalOilWeight: z
      .number({ invalid_type_error: '请输入总油重' })
      .min(1, '总油重须大于 0'),
    superfatPercentage: z
      .union([z.number(), z.null(), z.nan()], {
        invalid_type_error: '请输入超脂比例',
        required_error: '请输入超脂比例',
      })
      .refine((v) => v !== null && !Number.isNaN(v), {
        message: '请输入超脂比例',
      })
      .transform((v) => v as number)
      .pipe(
        z
          .number()
          .min(0, '超脂比例不能小于 0，范围 0% ~ 20%')
          .max(20, '超脂比例不能超过 20，范围 0% ~ 20%'),
      ),
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
