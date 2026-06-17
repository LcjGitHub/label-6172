import { useMemo, useRef, useState } from 'react';
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
import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import { buildOilMap } from '../lib/calc';
import { exportRecipesToFile, parseImportFile } from '../lib/exportImportUtils';
import { useRecipeStore } from '../store/recipeStore';
import type { AlkaliType, Oil } from '../types';

const oils = oilsData as Oil[];

const alkaliLabel = (type: AlkaliType | undefined) =>
  type === 'KOH' ? 'KOH' : 'NaOH';

/**
 * 配方列表页面
 */
export function RecipesPage() {
  const recipes = useRecipeStore((s) => s.recipes);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);
  const importRecipes = useRecipeStore((s) => s.importRecipes);
  const oilMap = useMemo(() => buildOilMap(oils), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const formatOils = (oilIds: { oilId: string; percentage: number }[]) =>
    oilIds
      .map((item) => {
        const name = oilMap.get(item.oilId)?.name ?? item.oilId;
        return `${name} ${item.percentage}%`;
      })
      .join('、');

  const handleExport = () => {
    exportRecipesToFile(recipes);
    message.success(`已导出 ${recipes.length} 个配方`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const incoming = await parseImportFile(file);
      const result = importRecipes(incoming);
      if (result.importedCount === 0) {
        message.warning(
          `导入完成：全部 ${result.skippedCount} 个配方因名称重复被跳过`,
        );
      } else if (result.skippedCount === 0) {
        message.success(`导入完成：成功导入 ${result.importedCount} 个`);
      } else {
        message.success(
          `导入完成：成功导入 ${result.importedCount} 个，跳过 ${result.skippedCount} 个重复`,
        );
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        配方列表
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        已保存的配方会持久化到本地，可随时查看或删除。支持「导出全部」将配方导出为数据备份文件，或「从文件导入」将备份中的配方合并写入本地（同名配方将被跳过）。
      </Typography.Paragraph>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%' }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={recipes.length === 0}
          >
            导出全部
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={handleImportClick}
            loading={importing}
          >
            从文件导入
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Space>
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
                render: (v: number | undefined) => {
                  if (v === undefined || v === null || Number.isNaN(v)) {
                    return <Tag>未设置</Tag>;
                  }
                  return <Tag color="orange">{v}%</Tag>;
                },
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
                render: (v: string, record: any) => (
                  <Tag color="blue">
                    {v} g {alkaliLabel(record.alkaliType)}
                  </Tag>
                ),
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
                render: (_: unknown, record: any) => (
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
