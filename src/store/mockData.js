export const defaultSettings = {}


const id = () => crypto.randomUUID()

export function generateMockData() {
  const jobs = [
    {
      id: id(), companyName: 'ByteDance', jobTitle: '高级后端工程师', status: '二面中',
      city: '北京', salaryRange: '35K-50K', workMode: ' onsite', channel: '内推',
      priority: '高', appliedDate: '2026-04-28', jobLink: '', jdText: '',
      contactName: '李学长', contactInfo: '微信: xxx',
      nextAction: '2026-05-14 二面', notes: '算法题要多练', endReason: '',
      interviewRounds: [
        { id: id(), round: '一面', status: '已通过', date: '2026-05-08', result: '通过', notes: '技术面，算法题2道，系统设计1道' },
      ],
      timeline: [
        { date: '2026-04-28', action: '投递简历', detail: '通过内推投递' },
        { date: '2026-05-03', action: '简历筛选通过', detail: 'HR 联系安排一面' },
        { date: '2026-05-08', action: '一面完成', detail: '技术面，算法题2道，系统设计1道' },
        { date: '2026-05-10', action: '进入二面', detail: '等待二面通知' },
      ],
    },
    {
      id: id(), companyName: 'Alibaba', jobTitle: '后端开发工程师', status: 'OA / 笔试',
      city: '杭州', salaryRange: '30K-45K', workMode: ' onsite', channel: '官网投递',
      priority: '高', appliedDate: '2026-05-01', jobLink: '', jdText: '',
      contactName: '', contactInfo: '',
      nextAction: '2026-05-15 笔试截止', notes: '', endReason: '',
      timeline: [
        { date: '2026-05-01', action: '投递简历', detail: '官网直投' },
        { date: '2026-05-06', action: '收到笔试链接', detail: '需要在5月15日前完成' },
      ],
    },
    {
      id: id(), companyName: 'Tencent', jobTitle: '全栈开发工程师', status: '已投递',
      city: '深圳', salaryRange: '35K-55K', workMode: ' onsite', channel: '猎头',
      priority: '中', appliedDate: '2026-05-06', jobLink: '', jdText: '',
      contactName: '王猎头', contactInfo: '电话: 138xxxx',
      nextAction: '等待筛选结果', notes: '', endReason: '',
      timeline: [
        { date: '2026-05-06', action: '投递简历', detail: '通过猎头推荐投递' },
      ],
    },
    {
      id: id(), companyName: 'Meituan', jobTitle: '后端开发工程师', status: 'Offer',
      city: '北京', salaryRange: '28K-42K', workMode: ' onsite', channel: '内推',
      priority: '中', appliedDate: '2026-04-15', jobLink: '', jdText: '',
      contactName: '刘师兄', contactInfo: '微信: llyy',
      nextAction: '2026-05-20 前确认', notes: '团队氛围不错，薪资可谈', endReason: '',
      interviewRounds: [
        { id: id(), round: '一面', status: '已通过', date: '2026-04-20', result: '通过', notes: '技术面，考察Java基础' },
        { id: id(), round: '二面', status: '已通过', date: '2026-04-25', result: '通过', notes: '主管面，聊项目经验' },
      ],
      timeline: [
        { date: '2026-04-15', action: '投递简历', detail: '内推投递' },
        { date: '2026-04-20', action: '一面', detail: '技术面，考察Java基础' },
        { date: '2026-04-25', action: '二面', detail: '主管面，聊项目经验' },
        { date: '2026-05-01', action: 'HR 面', detail: '谈薪资和入职时间' },
        { date: '2026-05-08', action: '收到 Offer', detail: '28K * 15薪' },
      ],
    },
    {
      id: id(), companyName: 'Xiaomi', jobTitle: '服务端开发工程师', status: '已结束',
      city: '北京', salaryRange: '25K-38K', workMode: ' onsite', channel: '官网投递',
      priority: '低', appliedDate: '2026-04-10', jobLink: '', jdText: '',
      contactName: '', contactInfo: '',
      nextAction: '', notes: '技术栈不匹配', endReason: '被拒绝',
      timeline: [
        { date: '2026-04-10', action: '投递简历', detail: '官网投递' },
        { date: '2026-04-18', action: '简历未通过', detail: '技术栈匹配度不够' },
      ],
    },
    {
      id: id(), companyName: 'Pinduoduo', jobTitle: '后端研发工程师', status: '感兴趣',
      city: '上海', salaryRange: '35K-50K', workMode: ' onsite', channel: '',
      priority: '中', appliedDate: '', jobLink: 'https://example.com/pdd', jdText: '负责电商后端系统设计开发...',
      contactName: '', contactInfo: '',
      nextAction: '了解一下团队情况', notes: '拼多多核心部门', endReason: '',
      timeline: [],
    },
    {
      id: id(), companyName: 'Baidu', jobTitle: 'AI平台后端开发', status: '感兴趣',
      city: '北京', salaryRange: '30K-48K', workMode: ' onsite', channel: '',
      priority: '高', appliedDate: '', jobLink: 'https://example.com/baidu', jdText: '负责AI平台后端服务开发...',
      contactName: '', contactInfo: '',
      nextAction: '修改简历后投递', notes: '需要准备系统设计', endReason: '',
      timeline: [],
    },
    {
      id: id(), companyName: 'NetEase', jobTitle: '游戏后端开发', status: '感兴趣',
      city: '广州', salaryRange: '28K-45K', workMode: ' onsite', channel: '',
      priority: '低', appliedDate: '', jobLink: '', jdText: '',
      contactName: '', contactInfo: '',
      nextAction: '', notes: '游戏方向，需要考虑', endReason: '',
      timeline: [],
    },
    {
      id: id(), companyName: 'Bilibili', jobTitle: 'Go 后端开发', status: '感兴趣',
      city: '上海', salaryRange: '28K-42K', workMode: ' onsite', channel: '内推',
      priority: '中', appliedDate: '', jobLink: '', jdText: '',
      contactName: '陈学姐', contactInfo: 'B站内部',
      nextAction: '联系学姐了解详情', notes: '', endReason: '',
      timeline: [],
    },
    {
      id: id(), companyName: '快手', jobTitle: '后端架构师', status: 'OA / 笔试',
      city: '北京', salaryRange: '40K-60K', workMode: ' hybrid', channel: '猎头',
      priority: '高', appliedDate: '2026-05-04', jobLink: '', jdText: '',
      contactName: '张猎头', contactInfo: '微信: zlt',
      nextAction: '2026-05-16 笔试', notes: '架构方向，需要准备分布式', endReason: '',
      timeline: [
        { date: '2026-05-04', action: '投递简历', detail: '猎头推荐' },
        { date: '2026-05-08', action: '简历通过', detail: '发送了笔试链接' },
      ],
    },
    {
      id: id(), companyName: '小红书', jobTitle: '后端开发工程师', status: '已投递',
      city: '上海', salaryRange: '30K-45K', workMode: ' onsite', channel: '官网投递',
      priority: '中', appliedDate: '2026-05-09', jobLink: '', jdText: '',
      contactName: '', contactInfo: '',
      nextAction: '等待反馈', notes: '', endReason: '',
      timeline: [
        { date: '2026-05-09', action: '投递简历', detail: '官网直投' },
      ],
    },
    {
      id: id(), companyName: '蚂蚁集团', jobTitle: 'Java 高级开发', status: '三面中',
      city: '杭州', salaryRange: '35K-55K', workMode: ' onsite', channel: '内推',
      priority: '高', appliedDate: '2026-04-20', jobLink: '', jdText: '',
      contactName: '赵同学', contactInfo: '钉钉: zhao',
      nextAction: '2026-05-13 三面', notes: '业务很核心，需要准备高并发', endReason: '',
      interviewRounds: [
        { id: id(), round: '一面', status: '已通过', date: '2026-04-26', result: '通过', notes: '技术基础面' },
        { id: id(), round: '二面', status: '已通过', date: '2026-05-05', result: '通过', notes: '项目深挖，系统设计' },
      ],
      timeline: [
        { date: '2026-04-20', action: '投递简历', detail: '内推投递' },
        { date: '2026-04-26', action: '一面', detail: '技术基础面' },
        { date: '2026-05-05', action: '二面', detail: '项目深挖，系统设计' },
        { date: '2026-05-10', action: '进入三面', detail: '等待主管面' },
      ],
    },
    {
      id: id(), companyName: '得物', jobTitle: '后端开发', status: '已结束',
      city: '上海', salaryRange: '26K-40K', workMode: ' onsite', channel: '官网投递',
      priority: '低', appliedDate: '2026-03-25', jobLink: '', jdText: '',
      contactName: '', contactInfo: '',
      nextAction: '', notes: '流程太长了', endReason: '自己放弃',
      interviewRounds: [
        { id: id(), round: '一面', status: '已通过', date: '2026-04-02', result: '通过', notes: '技术面' },
        { id: id(), round: '二面', status: '已通过', date: '2026-04-15', result: '通过', notes: '项目面' },
      ],
      timeline: [
        { date: '2026-03-25', action: '投递简历', detail: '官网投递' },
        { date: '2026-04-02', action: '一面', detail: '技术面' },
        { date: '2026-04-15', action: '二面', detail: '项目面' },
        { date: '2026-04-28', action: '主动放弃', detail: '流程过长，已接受其他 Offer' },
      ],
    },
    {
      id: id(), companyName: '京东', jobTitle: '后端架构师', status: '二面中',
      city: '北京', salaryRange: '38K-55K', workMode: ' onsite', channel: '猎头',
      priority: '中', appliedDate: '2026-04-22', jobLink: '', jdText: '',
      contactName: '刘猎头', contactInfo: '电话: 139xxxx',
      nextAction: '等 HR 通知', notes: '架构方向需要补充DDD知识', endReason: '',
      interviewRounds: [
        { id: id(), round: '一面', status: '已通过', date: '2026-04-28', result: '通过', notes: '技术面，考察架构设计' },
      ],
      timeline: [
        { date: '2026-04-22', action: '投递简历', detail: '猎头推荐' },
        { date: '2026-04-28', action: '一面', detail: '技术面，考察架构设计' },
        { date: '2026-05-06', action: '二面', detail: 'CTO 面' },
      ],
    },
  ]


  const tasks = [
    { id: id(), title: 'ByteDance 技术二面', type: '面试', date: '2026-05-14', startTime: '10:00', endTime: '11:00', priority: '高', done: false, jobId: jobs[0].id, notes: '准备系统设计' },
    { id: id(), title: '完成 Alibaba 在线笔试', type: 'OA / 笔试', date: '2026-05-15', startTime: '23:59', endTime: '', priority: '高', done: false, jobId: jobs[1].id, notes: '算法 + 行测' },
    { id: id(), title: '蚂蚁集团三面', type: '面试', date: '2026-05-13', startTime: '14:30', endTime: '15:30', priority: '高', done: false, jobId: jobs[11].id, notes: '主管面，准备BQ问题' },
    { id: id(), title: '快手笔试截止', type: 'Deadline', date: '2026-05-16', startTime: '23:59', endTime: '', priority: '中', done: false, jobId: jobs[9].id, notes: '2小时，4道算法' },
    { id: id(), title: '跟进 ByteDance 二面结果', type: 'Follow-up', date: '2026-05-15', startTime: '', endTime: '', priority: '中', done: false, jobId: jobs[0].id, notes: '发感谢信并询问后续' },
    { id: id(), title: '复习系统设计', type: '准备任务', date: '2026-05-12', startTime: '20:00', endTime: '22:00', priority: '中', done: false, jobId: null, notes: '分布式系统常见面试题' },
    { id: id(), title: 'Meituan Offer 确认截止', type: 'Deadline', date: '2026-05-20', startTime: '23:59', endTime: '', priority: '高', done: false, jobId: jobs[3].id, notes: '需要回复确认邮件' },
    { id: id(), title: '整理 Tencent 面经', type: '其他', date: '2026-05-11', startTime: '17:00', endTime: '18:00', priority: '低', done: true, jobId: jobs[2].id, notes: '' },
    { id: id(), title: 'LeetCode 每日一题', type: '准备任务', date: '2026-05-12', startTime: '09:00', endTime: '10:00', priority: '低', done: true, jobId: null, notes: '' },
    { id: id(), title: 'Follow-up 京东二面', type: 'Follow-up', date: '2026-05-13', startTime: '', endTime: '', priority: '中', done: false, jobId: jobs[13].id, notes: '询问面试结果' },
  ]


  return { jobs, tasks }
}
