import { useMemo } from 'react';
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import { buildOilMap } from '../lib/calc';
import { useRecipeStore } from '../store/recipeStore';
import type { Oil } from '../types';

const oils = oilsData as Oil[];

/**
 * 配方列表页面
 */
export function RecipesPage() {
  const recipes = useRecipeStore((s) => s.recipes);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);
  const oilMap = useMemo(() => buildOilMap(oils), []);

  const formatOils = (oilIds: { oilId: string; percentage: number }[]) =>
    oilIds
      .map((item) => {
        const name = oilMap.get(item.oilId)?.name ?? item.oilId;
        return `${name} ${item.percentage}%`;
      })
      .join('、');

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        配方列表
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        已保存的配方会持久化到本地，可随时查看或删除。
      </Typography.Paragraph>

      <Card>
        {recipes.length === 0 ? (
          <Empty description="暂无保存的配方，请前往计算器保存" />
        ) : (
          <Table
            rowKey="id"
            dataSource={recipes}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={[
              {
                title: '配方名称',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
              },
              {
                title: '总油重',
                dataIndex: 'totalOilWeight',
                key: 'totalOilWeight',
                render: (v: number) => `${v} g`,
              },
              {
                title: '超脂比例',
                dataIndex: 'superfatPercentage',
                key: 'superfatPercentage',
                render: (v: number) => (
                  <Tag color="orange">{v}%</Tag>
                ),
              },
              {
                title: '油脂配比',
                dataIndex: 'oils',
                key: 'oils',
                render: (oilsList: { oilId: string; percentage: number }[]) => (
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {formatOils(oilsList)}
                  </Typography.Text>
                ),
              },
              {
                title: '碱量',
                dataIndex: 'lyeAmount',
                key: 'lyeAmount',
                render: (v: string) => <Tag color="blue">{v} g NaOH</Tag>,
              },
              {
                title: '水量',
                dataIndex: 'waterAmount',
                key: 'waterAmount',
                render: (v: string) => `${v} g`,
              },
              {
                title: '保存时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (v: string) => new Date(v).toLocaleString('zh-CN'),
              },
              {
                title: '操作',
                key: 'action',
                render: (_: unknown, record: { id: string; name: string }) => (
                  <Popconfirm
                    title="确认删除该配方？"
                    description={record.name}
                    onConfirm={() => {
                      removeRecipe(record.id);
                      message.success('已删除');
                    }}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
