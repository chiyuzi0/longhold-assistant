import { Card, Typography } from 'antd';

export function DashboardPage() {
  return (
    <div>
      <Typography.Title level={3}>今日长线看板</Typography.Title>
      <div className="card-grid">
        <Card title="A股候选池">待接入数据</Card>
        <Card title="港股候选池">待接入数据</Card>
        <Card title="我的持仓">待导入持仓</Card>
        <Card title="风险提醒">暂无数据</Card>
      </div>
    </div>
  );
}
