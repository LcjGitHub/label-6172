import { useMemo, useState } from 'react';
import {
  Card,
  Empty,
  Input,
  Space,
  Table,
  Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import type { Oil } from '../types';

const oils = oilsData as Oil[];

/**
 * 油脂库浏览页面
 */
export function OilsLibraryPage() {
  const [keyword, setKeyword] = useState('');

  const filteredOils = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return oils;
    return oils.filter((oil) => oil.name.toLowerCase().includes(kw));
  }, [keyword]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        油脂库
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        浏览全部可用油脂及其皂化值（SAP 值），支持按名称关键字筛选。
      </Typography.Paragraph>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="输入油脂名称关键字筛选"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <Typography.Text type="secondary">
            共 {filteredOils.length} / {oils.length} 条
          </Typography.Text>
        </Space>

        {filteredOils.length === 0 && keyword.trim() ? (
          <Empty description="未找到匹配的油脂，请尝试其他关键字" />
        ) : (
          <Table
            rowKey="id"
            dataSource={filteredOils}
            pagination={false}
            columns={[
              {
                title: '油脂名称',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
              },
              {
                title: '皂化值（SAP 值）',
                dataIndex: 'sapValue',
                key: 'sapValue',
                width: 240,
                render: (v: number) => (
                  <Typography.Text code>{v} g NaOH / g 油脂</Typography.Text>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
