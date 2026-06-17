import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { CalculatorOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import oilsData from '../mock/oils.json';
import { buildOilMap } from '../lib/calc';
import { exportRecipesToFile, parseImportFile } from '../lib/exportImportUtils';
import { filterRecipesByName } from '../lib/filterUtils';
import { useRecipeStore } from '../store/recipeStore';
import { useCalcLoadStore } from '../store/calcLoadStore';
import type { AlkaliType, Oil } from '../types';

const oils = oilsData as Oil[];

const alkaliLabel = (type: AlkaliType | undefined) =>
  type === 'KOH' ? '氢氧化钾' : '氢氧化钠';

/**
 * 配方列表页面
 */
export function RecipesPage() {
  const navigate = useNavigate();
  const recipes = useRecipeStore((s) => s.recipes);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);
  const duplicateRecipe = useRecipeStore((s) => s.duplicateRecipe);
  const importRecipes = useRecipeStore((s) => s.importRecipes);
  const setLoadedRecipe = useCalcLoadStore((s) => s.setLoadedRecipe);
  const oilMap = useMemo(() => buildOilMap(oils), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [keyword, setKeyword] = useState('');

  const filteredRecipes = useMemo(() => {
    return filterRecipesByName(recipes, keyword);
  }, [recipes, keyword]);

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
        已保存的配方会持久化到本地，可随时查看或删除。支持按配方名称关键字实时筛选，备注列内容过长时将自动省略截断，鼠标悬停可查看完整备注。支持「导出全部」将配方导出为数据备份文件，或「从文件导入」将备份中的配方合并写入本地（同名配方将被跳过）。
      </Typography.Paragraph>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="输入配方名称关键字筛选"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <Typography.Text type="secondary">
              共 {filteredRecipes.length} / {recipes.length} 条
            </Typography.Text>
          </Space>
          <Space>
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
          </Space>
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
        ) : filteredRecipes.length === 0 ? (
          <Empty description="未找到匹配的配方，请尝试其他关键字" />
        ) : (
          <Table
            rowKey="id"
            dataSource={filteredRecipes}
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
                    {v} 克 {alkaliLabel(record.alkaliType)}
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
                title: '备注',
                dataIndex: 'notes',
                key: 'notes',
                width: 160,
                render: (v: string | undefined) => {
                  if (!v) return <Typography.Text type="secondary">-</Typography.Text>;
                  if (v.length > 20) {
                    return (
                      <Tooltip title={v} placement="topLeft">
                        <Typography.Text
                          style={{
                            maxWidth: 140,
                            display: 'inline-block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                          }}
                        >
                          {v}
                        </Typography.Text>
                      </Tooltip>
                    );
                  }
                  return <Typography.Text>{v}</Typography.Text>;
                },
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
                  <Space size="small">
                    <Button
                      type="primary"
                      size="small"
                      icon={<CalculatorOutlined />}
                      onClick={() => {
                        setLoadedRecipe(
                          {
                            recipeName: record.name,
                            totalOilWeight: record.totalOilWeight,
                            superfatPercentage: record.superfatPercentage ?? 0,
                            alkaliType: record.alkaliType ?? 'NaOH',
                            oils: record.oils,
                            recipeNotes: record.notes ?? '',
                          },
                          record.id,
                        );
                        message.success(`已载入配方「${record.name}」`);
                        navigate('/calc');
                      }}
                    >
                      载入计算器
                    </Button>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        const copy = duplicateRecipe(record.id);
                        if (copy) {
                          message.success(`已复制配方「${copy.name}」`);
                        }
                      }}
                    >
                      复制配方
                    </Button>
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
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
