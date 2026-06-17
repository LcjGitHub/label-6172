import { Layout, Menu, Typography } from 'antd';
import {
  CalculatorOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Content } = Layout;

/**
 * 应用布局：顶部导航 + 内容区
 */
export function AppLayout() {
  const location = useLocation();
  const selectedKey = location.pathname.startsWith('/recipes')
    ? '/recipes'
    : '/calc';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 24px',
        }}
      >
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          冷制皂碱量计算器
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            {
              key: '/calc',
              icon: <CalculatorOutlined />,
              label: <Link to="/calc">计算器</Link>,
            },
            {
              key: '/recipes',
              icon: <UnorderedListOutlined />,
              label: <Link to="/recipes">配方列表</Link>,
            },
          ]}
        />
      </Header>
      <Content style={{ padding: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
