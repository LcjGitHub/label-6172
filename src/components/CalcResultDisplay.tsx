import { Alert, Card, Col, Divider, Row, Statistic, Table } from 'antd';
import type { BatchCalcResult, CalcResult } from '../types';
import { getAlkaliLabel, getAlkaliSuffix } from '../lib/calc';

/**
 * 渲染碱量计算/批量换算的通用指标与明细表格内容
 * @param data - 计算结果（CalcResult 或 BatchCalcResult）
 * @param isBatch - 是否为批量换算模式，影响标题文案
 */
function renderResultContent<T extends CalcResult | BatchCalcResult>(data: T, isBatch: boolean) {
  const alkaliType = data.alkaliType;
  const alkaliLabel = getAlkaliLabel(alkaliType);
  const alkaliSuffix = getAlkaliSuffix(alkaliType);

  const lyeBeforeTitle = isBatch
    ? `批量扣减前${alkaliLabel}量`
    : `扣减前${alkaliLabel}量`;
  const lyeDeductionTitle = `${alkaliLabel}超脂扣减量`;
  const lyeFinalTitle = isBatch
    ? `批量扣减后${alkaliLabel}量（最终）`
    : `扣减后${alkaliLabel}量（最终）`;

  const oilWeightTitle = isBatch ? '批量总油重' : '总油重';
  const waterTitle = isBatch ? '批量建议水量' : '建议水量（Mock 2.5×最终碱量）';
  const weightColumnTitle = isBatch ? '批量重量（克）' : '重量（克）';
  const lyeColumnTitle = isBatch
    ? `批量贡献${alkaliLabel}量（克）`
    : `贡献${alkaliLabel}量（克）`;

  return (
    <>
      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Statistic
            title={lyeBeforeTitle}
            value={data.lyeBeforeSuperfat}
            suffix={alkaliSuffix}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={lyeDeductionTitle}
            value={data.superfatDeduction}
            suffix="克"
            valueStyle={{ color: '#fa8c16' }}
            prefix={parseFloat(data.superfatDeduction) > 0 ? '-' : undefined}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={lyeFinalTitle}
            value={data.lyeAmount}
            suffix={alkaliSuffix}
            valueStyle={{ color: '#1677ff', fontWeight: 600 }}
          />
        </Col>
      </Row>

      <Row gutter={24} style={{ marginBottom: isBatch ? 16 : 0 }}>
        <Col xs={24} sm={8}>
          <Statistic title={oilWeightTitle} value={data.totalOilWeight} suffix="克" />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic title={waterTitle} value={data.waterAmount} suffix="克" />
        </Col>
        {isBatch && (
          <Col xs={24} sm={8}>
            <Statistic
              title="成品总重量"
              value={(data as BatchCalcResult).targetTotalWeight}
              suffix="克"
              prefix={`${(data as BatchCalcResult).singleBlockWeight}克 × ${(data as BatchCalcResult).batchCount} 块 =`}
            />
          </Col>
        )}
      </Row>

      <Divider />

      <Table
        rowKey="oilId"
        pagination={false}
        size="small"
        dataSource={data.oilDetails}
        columns={[
          { title: '油脂', dataIndex: 'oilName', key: 'oilName' },
          { title: '比例', dataIndex: 'percentage', key: 'percentage', render: (v) => `${v}%` },
          { title: weightColumnTitle, dataIndex: 'weight', key: 'weight' },
          { title: lyeColumnTitle, dataIndex: 'lye', key: 'lye' },
        ]}
      />
    </>
  );
}

/**
 * 碱量计算结果展示组件
 * 渲染带 Card 外壳的单次碱量计算结果（指标卡片 + 油脂明细表）
 */
export function CalcResultDisplay({ result }: { result: CalcResult }) {
  const alkaliLabel = getAlkaliLabel(result.alkaliType);
  return (
    <Card title={`计算结果（${alkaliLabel}）`}>
      {renderResultContent(result, false)}
    </Card>
  );
}

/**
 * 批量换算结果展示组件
 * 仅渲染批量换算结果内容（换算系数提示 + 指标卡片 + 油脂明细表），不含外层 Card
 * 适用于需要在外层 Card 中同时放置输入表单与结果的场景
 */
export function BatchCalcResultDisplay({ result }: { result: BatchCalcResult }) {
  return (
    <>
      <Alert
        type="info"
        showIcon
        message={`换算系数：${result.scaleFactor}（当前配方成品总重 ${result.currentTotalWeight}克 → 目标总重 ${result.targetTotalWeight}克）`}
        style={{ marginBottom: 16 }}
      />
      {renderResultContent(result, true)}
    </>
  );
}
