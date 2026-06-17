import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import { buildOilMap, calculateBatch, calculateLye, sumPercentages } from '../lib/calc';
import { calcFormSchema, type CalcFormValues } from '../schemas/calcSchema';
import { useRecipeStore } from '../store/recipeStore';
import type { CalcResult, Oil } from '../types';

const oils = oilsData as Oil[];

const defaultValues: CalcFormValues = {
  recipeName: '',
  totalOilWeight: 500,
  superfatPercentage: 5,
  oils: [{ oilId: 'olive', percentage: 100 }],
};

/**
 * 碱量计算器页面
 */
export function CalcPage() {
  const oilMap = useMemo(() => buildOilMap(oils), []);
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [singleBlockWeight, setSingleBlockWeight] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CalcFormValues>({
    resolver: zodResolver(calcFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'oils',
  });

  const watchedOils = watch('oils');
  const percentageSum = sumPercentages(watchedOils ?? []);
  const isSumValid = percentageSum.equals(100);

  const usedOilIds = watchedOils?.map((o) => o.oilId) ?? [];

  const batchCalcResult = useMemo(() => {
    if (!result || !singleBlockWeight || !batchCount || singleBlockWeight <= 0 || batchCount <= 0) {
      return null;
    }
    return calculateBatch(result, singleBlockWeight, batchCount);
  }, [result, singleBlockWeight, batchCount]);

  const onCalculate = handleSubmit((values) => {
    const calc = calculateLye(
      values.totalOilWeight,
      values.oils,
      oilMap,
      values.superfatPercentage,
    );
    setResult(calc);
    message.success('计算完成');
  });

  const onSave = handleSubmit((values) => {
    const calc = calculateLye(
      values.totalOilWeight,
      values.oils,
      oilMap,
      values.superfatPercentage,
    );
    const name = values.recipeName?.trim();
    if (!name) {
      message.warning('保存前请填写配方名称');
      return;
    }
    addRecipe({
      name,
      totalOilWeight: values.totalOilWeight,
      superfatPercentage: values.superfatPercentage,
      oils: values.oils,
      lyeAmount: calc.lyeAmount,
      waterAmount: calc.waterAmount,
    });
    message.success('配方已保存');
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        碱量计算器
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        选择多种油脂并填写比例（合计 100%），输入总油重后按 Mock 皂化值计算氢氧化钠用量。可设置 0%~20% 的超脂比例，系统将按比例从原始碱量中扣减相应氢氧化钠，使成品保留更多未皂化油脂，滋润肌肤。
      </Typography.Paragraph>

      <Card title="配方参数">
        <Form layout="vertical" onFinish={onCalculate}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="配方名称（保存时必填）"
                validateStatus={errors.recipeName ? 'error' : undefined}
              >
                <Controller
                  name="recipeName"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="例如：温和沐浴皂" />
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="总油脂重量（g）"
                required
                validateStatus={errors.totalOilWeight ? 'error' : undefined}
                help={errors.totalOilWeight?.message}
              >
                <Controller
                  name="totalOilWeight"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={1}
                      style={{ width: '100%' }}
                      addonAfter="g"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="超脂比例（%）"
                required
                validateStatus={errors.superfatPercentage ? 'error' : undefined}
                help={errors.superfatPercentage?.message}
              >
                <Controller
                  name="superfatPercentage"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={0}
                      max={20}
                      precision={2}
                      step={0.5}
                      style={{ width: '100%' }}
                      addonAfter="%"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">油脂配比</Divider>

          {errors.oils?.message && (
            <Alert
              type="error"
              message={errors.oils.message}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <Alert
            type={isSumValid ? 'success' : 'warning'}
            message={`当前比例合计：${percentageSum.toFixed(2)}%${isSumValid ? '（校验通过）' : '（须为 100%）'}`}
            style={{ marginBottom: 16 }}
            showIcon
          />

          {fields.map((field, index) => (
            <Row key={field.id} gutter={12} align="middle" style={{ marginBottom: 12 }}>
              <Col xs={24} sm={10}>
                <Form.Item
                  label={index === 0 ? '油脂' : undefined}
                  required
                  validateStatus={errors.oils?.[index]?.oilId ? 'error' : undefined}
                  help={errors.oils?.[index]?.oilId?.message}
                  style={{ marginBottom: 0 }}
                >
                  <Controller
                    name={`oils.${index}.oilId`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        placeholder="选择油脂"
                        options={oils.map((oil) => ({
                          value: oil.id,
                          label: `${oil.name}（SAP ${oil.sapValue}）`,
                          disabled:
                            usedOilIds.includes(oil.id) && f.value !== oil.id,
                        }))}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={18} sm={8}>
                <Form.Item
                  label={index === 0 ? '比例' : undefined}
                  required
                  validateStatus={errors.oils?.[index]?.percentage ? 'error' : undefined}
                  help={errors.oils?.[index]?.percentage?.message}
                  style={{ marginBottom: 0 }}
                >
                  <Controller
                    name={`oils.${index}.percentage`}
                    control={control}
                    render={({ field: f }) => (
                      <InputNumber
                        {...f}
                        min={0.01}
                        max={100}
                        precision={2}
                        style={{ width: '100%' }}
                        addonAfter="%"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={6} sm={6}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                  style={{ marginTop: index === 0 ? 30 : 0 }}
                >
                  删除
                </Button>
              </Col>
            </Row>
          ))}

          <Space wrap style={{ marginTop: 8 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                const available = oils.find((o) => !usedOilIds.includes(o.id));
                if (!available) {
                  message.warning('已添加全部油脂');
                  return;
                }
                append({ oilId: available.id, percentage: 0 });
              }}
            >
              添加油脂
            </Button>
            <Button type="primary" htmlType="submit">
              计算碱量
            </Button>
            <Button icon={<SaveOutlined />} onClick={onSave}>
              保存配方
            </Button>
          </Space>
        </Form>
      </Card>

      {result && (
        <Card title="计算结果">
          <Row gutter={24} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Statistic
                title="扣减前碱量"
                value={result.lyeBeforeSuperfat}
                suffix="g NaOH"
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="超脂扣减量"
                value={result.superfatDeduction}
                suffix="g"
                valueStyle={{ color: '#fa8c16' }}
                prefix={parseFloat(result.superfatDeduction) > 0 ? '-' : undefined}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="扣减后碱量（最终）"
                value={result.lyeAmount}
                suffix="g NaOH"
                valueStyle={{ color: '#1677ff', fontWeight: 600 }}
              />
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={8}>
              <Statistic title="总油重" value={result.totalOilWeight} suffix="g" />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="建议水量（Mock 2.5×最终碱量）"
                value={result.waterAmount}
                suffix="g"
              />
            </Col>
          </Row>

          <Divider />

          <Table
            rowKey="oilId"
            pagination={false}
            size="small"
            dataSource={result.oilDetails}
            columns={[
              { title: '油脂', dataIndex: 'oilName', key: 'oilName' },
              { title: '比例', dataIndex: 'percentage', key: 'percentage', render: (v) => `${v}%` },
              { title: '重量 (g)', dataIndex: 'weight', key: 'weight' },
              { title: '贡献碱量 (g)', dataIndex: 'lye', key: 'lye' },
            ]}
          />
        </Card>
      )}

      {result && (
        <Card title="批量换算">
          <Typography.Paragraph type="secondary">
            输入单块成品重量与计划制作块数，系统将按比例放大当前配方的各项用量。
          </Typography.Paragraph>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Form.Item label="单块成品重量（g）">
                <InputNumber
                  min={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="例如：100"
                  value={singleBlockWeight}
                  onChange={(v) => setSingleBlockWeight(v)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="计划制作块数">
                <InputNumber
                  min={1}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="例如：10"
                  value={batchCount}
                  onChange={(v) => setBatchCount(v)}
                />
              </Form.Item>
            </Col>
          </Row>

          {batchCalcResult && (
            <>
              <Alert
                type="info"
                showIcon
                message={`换算系数：${batchCalcResult.scaleFactor}（当前配方成品总重 → 目标总重）`}
                style={{ marginBottom: 16 }}
              />
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="批量总油重"
                    value={batchCalcResult.totalOilWeight}
                    suffix="g"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="批量碱量（最终）"
                    value={batchCalcResult.lyeAmount}
                    suffix="g NaOH"
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="批量建议水量"
                    value={batchCalcResult.waterAmount}
                    suffix="g"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="制作总量"
                    value={batchCalcResult.batchCount}
                    suffix="块"
                    prefix={`${batchCalcResult.singleBlockWeight}g ×`}
                  />
                </Col>
              </Row>

              <Divider />

              <Table
                rowKey="oilId"
                pagination={false}
                size="small"
                dataSource={batchCalcResult.oilDetails}
                columns={[
                  { title: '油脂', dataIndex: 'oilName', key: 'oilName' },
                  { title: '比例', dataIndex: 'percentage', key: 'percentage', render: (v) => `${v}%` },
                  { title: '批量重量 (g)', dataIndex: 'weight', key: 'weight' },
                  { title: '批量贡献碱量 (g)', dataIndex: 'lye', key: 'lye' },
                ]}
              />
            </>
          )}
        </Card>
      )}
    </Space>
  );
}
