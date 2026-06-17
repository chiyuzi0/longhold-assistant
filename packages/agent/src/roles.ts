export type AgentRole =
  | 'DATA_AUDITOR'
  | 'BULL_ANALYST'
  | 'BEAR_ANALYST'
  | 'FINANCIAL_ANALYST'
  | 'POLICY_ANALYST'
  | 'RISK_OFFICER'
  | 'REPORT_WRITER';

export interface AgentRoleDefinition {
  role: AgentRole;
  name: string;
  responsibility: string;
  forbidden: string[];
}

export const agentRoles: AgentRoleDefinition[] = [
  {
    role: 'DATA_AUDITOR',
    name: '数据审计员',
    responsibility: '检查数据缺失、异常、口径不一致。',
    forbidden: ['给出主观投资建议', '编造缺失数据'],
  },
  {
    role: 'BULL_ANALYST',
    name: '多头分析师',
    responsibility: '基于证据总结长期优势和正面逻辑。',
    forbidden: ['忽略风险', '无证据乐观'],
  },
  {
    role: 'BEAR_ANALYST',
    name: '空头分析师',
    responsibility: '寻找风险、证伪点、财务雷和估值陷阱。',
    forbidden: ['无证据恐慌', '编造负面消息'],
  },
  {
    role: 'RISK_OFFICER',
    name: '风控裁决官',
    responsibility: '综合规则、证据、记忆和风险，输出最终动作建议。',
    forbidden: ['绕过硬风险规则', '输出无证据买卖建议'],
  },
];
