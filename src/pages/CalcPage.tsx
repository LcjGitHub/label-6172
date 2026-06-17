import { useMemo, useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, PartitionOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import { buildOilMap, calculateBatch, calculateLye, evenlyDistributePercentages, sumPercentages } from '../lib/calc';
import { calcFormSchema, type CalcFormValues } from '../schemas/calcSchema';
import { useRecipeStore } from '../store/recipeStore';
import { useCalcLoadStore } from '../store/calcLoadStore';
import type { AlkaliType, CalcResult, Oil } from '../types';

const oils = oilsData as Oil[];

const defaultValues: CalcFormValues = {
  alkaliType: 'NaOH',
  recipeName: '',
  recipeNotes: '',
  totalOilWeight: 500,
  superfatPercentage: 5,
  oils: [{ oilId: 'olive', percentage: 100 }],
};

/**
 * 碱量计算器页面
 */
export function CalcPage() {
  const oilMap = useMemo(() => buildOilMap(oils), []);
  const saveRecipe = useRecipeStore((s) => s.saveRecipe);
  const loadedRecipe = useCalcLoadStore((s) => s.loadedRecipe);
  const sourceRecipeId = useCalcLoadStore((s) => s.sourceRecipeId);
  const clearLoadedRecipe = useCalcLoadStore((s) => s.clearLoadedRecipe);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [singleBlockWeight, setSingleBlockWeight] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const hasResultRef = useRef(false);
  const appliedLoadedRef = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    reset,
    setValue,
    trigger,
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
  const watchedAlkaliType = watch('alkaliType');
  const percentageSum = sumPercentages(watchedOils ?? []);
  const isSumValid = percentageSum.equals(100);

  const usedOilIds = watchedOils?.map((o) => o.oilId) ?? [];

  useEffect(() => {
    if (loadedRecipe && !appliedLoadedRef.current) {
      appliedLoadedRef.current = true;
      reset({
        alkaliType: loadedRecipe.alkaliType,
        recipeName: loadedRecipe.recipeName,
        recipeNotes: loadedRecipe.recipeNotes ?? '',
        totalOilWeight: loadedRecipe.totalOilWeight,
        superfatPercentage: loadedRecipe.superfatPercentage,
        oils: [...loadedRecipe.oils],
      });
      try {
        const calc = calculateLye(
          loadedRecipe.totalOilWeight,
          loadedRecipe.oils,
          oilMap,
          loadedRecipe.superfatPercentage,
          loadedRecipe.alkaliType,
        );
        setResult(calc);
        hasResultRef.current = true;
      } catch (e) {
        // ignore calc errors on load
      }
    }
  }, [loadedRecipe, reset, oilMap, setValue]);

  useEffect(() => {
    if (hasResultRef.current) {
      const values = getValues();
      if (
        values.totalOilWeight &&
        values.oils &&
        values.oils.length > 0 &&
        values.superfatPercentage !== undefined &&
        values.superfatPercentage !== null
      ) {
        const calc = calculateLye(
          values.totalOilWeight,
          values.oils,
          oilMap,
          values.superfatPercentage,
          values.alkaliType,
        );
        setResult(calc);
      }
    }
  }, [watchedAlkaliType, getValues, oilMap]);

  const alkaliLabel = (type: AlkaliType) => (type === 'NaOH' ? '氢氧化钠' : '氢氧化钾');
  const alkaliSuffix = (type: AlkaliType) => `克 ${alkaliLabel(type)}`;

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
      values.alkaliType,
    );
    setResult(calc);
    hasResultRef.current = true;
    message.success('计算完成');
  });

  const showNameConflictModal = (
    name: string,
    existingId: string,
    recipeData: Parameters<typeof saveRecipe>[0],
    onSuccess?: () => void,
  ) => {
    Modal.confirm({
      title: '配方名称已存在',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <div>已存在同名配方「{name}」，是否覆盖？</div>
          <Tag color="orange">选择「覆盖」将更新原有配方数据</Tag>
        </Space>
      ),
      okText: '覆盖保存',
      okButtonProps: { danger: true },
      cancelText: '另存为新配方',
      onOk: () => {
        saveRecipe(recipeData, { overwriteId: existingId });
        clearLoadedRecipe();
        appliedLoadedRef.current = false;
        message.success(`配方「${name}」已覆盖更新`);
        onSuccess?.();
      },
      onCancel: () => {
        saveRecipe(recipeData);
        clearLoadedRecipe();
        appliedLoadedRef.current = false;
        message.success(`配方「${name}」已另存为新配方`);
        onSuccess?.();
      },
    });
  };

  const onSave = handleSubmit((values) => {
    const calc = calculateLye(
      values.totalOilWeight,
      values.oils,
      oilMap,
      values.superfatPercentage,
      values.alkaliType,
    );
    const name = values.recipeName?.trim();
    if (!name) {
      message.warning('保存前请填写配方名称');
      return;
    }

    const recipeData = {
      name,
      totalOilWeight: values.totalOilWeight,
      superfatPercentage: values.superfatPercentage,
      alkaliType: values.alkaliType,
      oils: values.oils,
      lyeAmount: calc.lyeAmount,
      waterAmount: calc.waterAmount,
      notes: values.recipeNotes?.trim() || undefined,
    };

    const recipes = useRecipeStore.getState().recipes;
    const existingByName = recipes.find((r) => r.name === name);
    const isSelfByName = sourceRecipeId && existingByName?.id === sourceRecipeId;

    if (sourceRecipeId) {
      const sourceRecipe = recipes.find((r) => r.id === sourceRecipeId);
      const nameChanged = sourceRecipe && sourceRecipe.name !== name;

      if (!nameChanged || isSelfByName) {
        saveRecipe(recipeData, { overwriteId: sourceRecipeId });
        clearLoadedRecipe();
        appliedLoadedRef.current = false;
        message.success(`配方「${name}」已保存`);
        return;
      }

      if (existingByName && existingByName.id !== sourceRecipeId) {
        showNameConflictModal(name, existingByName.id, recipeData);
        return;
      }

      saveRecipe(recipeData, { overwriteId: sourceRecipeId });
      clearLoadedRecipe();
      appliedLoadedRef.current = false;
      message.success(`配方「${name}」已保存`);
      return;
    }

    if (existingByName) {
      showNameConflictModal(name, existingByName.id, recipeData);
      return;
    }

    saveRecipe(recipeData);
    message.success('配方已保存');
  });

  const onEvenDistribute = () => {
    const currentOils = getValues('oils');
    if (!currentOils || currentOils.length < 2) {
      message.warning('至少添加两种及以上油脂后方可均分比例');
      return;
    }
    const distributed = evenlyDistributePercentages(currentOils);
    setValue('oils', distributed, { shouldDirty: true, shouldTouch: true });
    trigger('oils');
    message.success('比例已均分，合计为 100%');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        碱量计算器
      </Typography.Title>

      {loadedRecipe && (
        <Alert
          type="info"
          showIcon
          message={
            <Space wrap>
              <span>
                已载入配方：<strong>{loadedRecipe.recipeName}</strong>
              </span>
              <Tag color="blue">总油重 {loadedRecipe.totalOilWeight} 克</Tag>
              <Tag color="orange">超脂 {loadedRecipe.superfatPercentage}%</Tag>
              <Tag color="green">
                碱类型 {loadedRecipe.alkaliType === 'NaOH' ? '氢氧化钠' : '氢氧化钾'}
              </Tag>
              {loadedRecipe.recipeNotes && loadedRecipe.recipeNotes.trim() && (
                <Tag color="purple">备注：{loadedRecipe.recipeNotes.trim()}</Tag>
              )}
            </Space>
          }
          description="表单已预填配方数据，您可在修改后重新计算或保存。保存时默认覆盖原配方。"
          action={
            <Button
              size="small"
              onClick={() => {
                clearLoadedRecipe();
                appliedLoadedRef.current = false;
                reset(defaultValues);
                setResult(null);
                hasResultRef.current = false;
                message.info('已取消载入状态，表单已恢复默认值');
              }}
            >
              取消载入
            </Button>
          }
        />
      )}

      <Typography.Paragraph type="secondary">
        选择多种油脂并填写比例（合计 100%），输入总油重后按 Mock 皂化值计算碱用量。支持氢氧化钠和氢氧化钾两种碱类型，氢氧化钾用量 = 氢氧化钠用量 × 0.7。可设置 0%~20% 的超脂比例，系统将按比例从原始碱量中扣减相应碱量，使成品保留更多未皂化油脂，滋润肌肤。添加两种及以上油脂后可点击「均分比例」按钮自动平均分配比例，合计恰好为 100%。保存配方时可填写可选备注，方便后续筛选和辨识。您也可以从「配方列表」页点击「载入计算器」，将已有配方的名称、总油重、油脂配比、备注等自动预填到本页表单，在此基础上修改后重新计算或保存。完成碱量计算后，可在下方批量换算区块输入单块成品重量与计划制作块数，按块数等比放大当前配方的总油重、碱量、建议水量及各油脂明细重量，换算过程全程使用高精度小数计算。
      </Typography.Paragraph>

      <Card title="配方参数">
        <Form layout="vertical" onFinish={onCalculate}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="碱类型" required>
                <Controller
                  name="alkaliType"
                  control={control}
                  render={({ field }) => (
                    <Radio.Group {...field}>
                      <Radio value="NaOH">氢氧化钠</Radio>
                      <Radio value="KOH">氢氧化钾（用量 = 氢氧化钠 × 0.7）</Radio>
                    </Radio.Group>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
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
            <Col xs={24}>
              <Form.Item
                label="备注（可选）"
                validateStatus={errors.recipeNotes ? 'error' : undefined}
                help={errors.recipeNotes?.message}
              >
                <Controller
                  name="recipeNotes"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea {...field} rows={2} placeholder="例如：适合干性肌肤，冬季使用" maxLength={500} showCount />
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
            <Button icon={<PartitionOutlined />} onClick={onEvenDistribute} disabled={fields.length < 2}>
              均分比例
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
        <Card title={`计算结果（${alkaliLabel(result.alkaliType)}）`}>
          <Row gutter={24} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Statistic
                title={`扣减前${alkaliLabel(result.alkaliType)}量`}
                value={result.lyeBeforeSuperfat}
                suffix={alkaliSuffix(result.alkaliType)}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title={`${alkaliLabel(result.alkaliType)}超脂扣减量`}
                value={result.superfatDeduction}
                suffix="克"
                valueStyle={{ color: '#fa8c16' }}
                prefix={parseFloat(result.superfatDeduction) > 0 ? '-' : undefined}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title={`扣减后${alkaliLabel(result.alkaliType)}量（最终）`}
                value={result.lyeAmount}
                suffix={alkaliSuffix(result.alkaliType)}
                valueStyle={{ color: '#1677ff', fontWeight: 600 }}
              />
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={8}>
              <Statistic title="总油重" value={result.totalOilWeight} suffix="克" />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="建议水量（Mock 2.5×最终碱量）"
                value={result.waterAmount}
                suffix="克"
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
              { title: '重量（克）', dataIndex: 'weight', key: 'weight' },
              { title: `贡献${alkaliLabel(result.alkaliType)}量（克）`, dataIndex: 'lye', key: 'lye' },
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

          {batchCalcResult ? (
            <>
              <Alert
                type="info"
                showIcon
                message={`换算系数：${batchCalcResult.scaleFactor}（当前配方成品总重 ${batchCalcResult.currentTotalWeight}克 → 目标总重 ${batchCalcResult.targetTotalWeight}克）`}
                style={{ marginBottom: 16 }}
              />
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={`批量扣减前${alkaliLabel(batchCalcResult.alkaliType)}量`}
                    value={batchCalcResult.lyeBeforeSuperfat}
                    suffix={alkaliSuffix(batchCalcResult.alkaliType)}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={`${alkaliLabel(batchCalcResult.alkaliType)}超脂扣减量`}
                    value={batchCalcResult.superfatDeduction}
                    suffix="克"
                    valueStyle={{ color: '#fa8c16' }}
                    prefix={parseFloat(batchCalcResult.superfatDeduction) > 0 ? '-' : undefined}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={`批量扣减后${alkaliLabel(batchCalcResult.alkaliType)}量（最终）`}
                    value={batchCalcResult.lyeAmount}
                    suffix={alkaliSuffix(batchCalcResult.alkaliType)}
                    valueStyle={{ color: '#1677ff', fontWeight: 600 }}
                  />
                </Col>
              </Row>
              <Row gutter={24} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="批量总油重"
                    value={batchCalcResult.totalOilWeight}
                    suffix="克"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="批量建议水量"
                    value={batchCalcResult.waterAmount}
                    suffix="克"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="成品总重量"
                    value={batchCalcResult.targetTotalWeight}
                    suffix="克"
                    prefix={`${batchCalcResult.singleBlockWeight}克 × ${batchCalcResult.batchCount} 块 =`}
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
                  { title: '批量重量（克）', dataIndex: 'weight', key: 'weight' },
                  { title: `批量贡献${alkaliLabel(batchCalcResult.alkaliType)}量（克）`, dataIndex: 'lye', key: 'lye' },
                ]}
              />
            </>
          ) : (
            <Empty description="请填写单块成品重量和计划制作块数" />
          )}
        </Card>
      )}
    </Space>
  );
}
