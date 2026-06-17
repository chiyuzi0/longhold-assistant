import { Layout, Menu, Typography } from 'antd';
import { DashboardPage } from './pages/DashboardPage';

const { Header, Sider, Content } = Layout;

export function App() {
  return (
    <Layout className="app-shell">
      <Sider width={240} theme="light">
        <div className="brand">LongHold Assistant</div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={[
            { key: 'dashboard', label: '首页看板' },
            { key: 'data', label: '数据准备' },
            { key: 'screening', label: '股票池筛选' },
            { key: 'portfolio', label: '持仓体检' },
            { key: 'stock', label: '单股研究' },
            { key: 'report', label: '报告中心' },
            { key: 'memory', label: '记忆管理' },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="topbar">
          <Typography.Text strong>A/H 股长线持仓研究助手</Typography.Text>
        </Header>
        <Content className="content">
          <DashboardPage />
        </Content>
      </Layout>
    </Layout>
  );
}
