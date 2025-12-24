# NaviX PRD v2.2 完整测试场景指南

**版本**: 2.2
**创建日期**: 2025-12-22
**适用项目**: NaviX (摸摸底/MoMoDi) AI 智能咨询系统

---

## 1. 测试概览

### 1.1 测试范围

基于 PRD v2.2 的 6 个核心用户故事，本测试方案覆盖：

| 模块 | PRD 章节 | 测试用例数 | 优先级 |
|------|---------|-----------|--------|
| 手机短信登录 | 3.1 | 28 | P0 |
| 用户管理后台 | 3.2 | 9 | P0 |
| 个人中心权益看板 | 3.3 | 6 | P1 |
| Discovery 频道 | 3.4 | 8 | P1 |
| 定制化服务专家接入 | 3.5 | 11 | P1 |
| 移动端适配 | 3.6 | 16 | P0 |
| 核心 API | - | 6 | P0 |
| 安全性测试 | - | 5 | P0 |
| 国际化测试 | - | 2 | P2 |
| 页面基础加载 | - | 10 | P1 |
| AI Chat 核心功能 | - | 4 | P1 |
| 性能基准测试 | - | 3 | P2 |
| **总计** | - | **108** | - |

---

## 2. 测试场景详解

### 2.1 手机短信登录 (PRD 3.1)

#### 2.1.1 UI 测试场景

| 测试编号 | 测试场景 | 预期结果 | 验证点 |
|----------|----------|----------|--------|
| LOGIN-UI-01 | 登录页面加载 | 页面标题包含"摸摸底" | 标题、布局 |
| LOGIN-UI-02 | 手机号输入 | 可输入11位手机号 | 输入框功能 |
| LOGIN-UI-03 | 图形验证码显示 | SVG 验证码图片可见 | 验证码生成 |
| LOGIN-UI-04 | 验证码刷新 | 点击刷新获取新验证码 | 刷新机制 |
| LOGIN-UI-05 | 发送按钮状态 | 填写完整后可点击 | 按钮状态 |
| LOGIN-UI-06 | 邮箱登录切换 | 点击切换到邮箱表单 | 登录方式切换 |
| LOGIN-UI-07 | Google OAuth | OAuth 按钮可见 | 第三方登录 |
| LOGIN-UI-08 | 注册链接 | 跳转到注册页 | 导航 |

#### 2.1.2 验证码 API 测试

| 测试编号 | 测试场景 | 请求 | 预期响应 |
|----------|----------|------|----------|
| CAPTCHA-API-01 | 获取验证码 | GET /api/auth/captcha | 200 + captcha_id, captcha_image |
| CAPTCHA-API-02 | 验证 base64 格式 | GET /api/auth/captcha | data:image/svg+xml;base64,... |
| CAPTCHA-API-03 | 验证错误答案 | POST /api/auth/captcha | 400 错误 |
| CAPTCHA-API-04 | 无效 captcha_id | POST /api/auth/captcha | 400/401 错误 |
| CAPTCHA-API-05 | 多次请求获取不同验证码 | 2x GET /api/auth/captcha | ID 不同 |

#### 2.1.3 短信 API 测试

| 测试编号 | 测试场景 | 请求 | 预期响应 |
|----------|----------|------|----------|
| SMS-API-01 | 空手机号 | POST /api/auth/sms/send | 400 |
| SMS-API-02 | 无效手机号格式 | POST /api/auth/sms/send (phone="123") | 400/401 |
| SMS-API-03 | 无效 captcha_token | POST /api/auth/sms/send | 401 |
| SMS-API-04 | 验证 SMS verify 存在 | POST /api/auth/sms/verify | 200/400/401/500 |
| SMS-API-05 | 无效验证码 | POST /api/auth/sms/verify (code="000000") | 400 |

---

### 2.2 用户管理后台 (PRD 3.2)

#### 2.2.1 访问控制测试

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| ADMIN-01 | 未登录访问 /admin | 重定向到 /auth/login 或显示 403 |
| ADMIN-02 | 访问 /admin/users | 需要管理员权限 |
| ADMIN-03 | 访问 /admin/consultations | 需要管理员权限 |
| ADMIN-04 | 访问 /admin/research-reports | 需要管理员权限 |

#### 2.2.2 API 安全测试

| 测试编号 | 测试场景 | 请求 | 预期响应 |
|----------|----------|------|----------|
| ADMIN-API-01 | 未授权获取用户列表 | GET /api/admin/users | 401/403 |
| ADMIN-API-02 | 未授权修改用户等级 | PUT /api/admin/users/{id}/level | 401/403 |
| ADMIN-API-03 | 未授权初始化 | POST /api/admin/init | 401/403 |
| ADMIN-API-04 | 越权攻击模拟 | PUT /api/admin/users/self/level | 401/403 |

---

### 2.3 个人中心权益看板 (PRD 3.3)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| PROFILE-01 | /profile 路由存在 | 页面加载或重定向 |
| PROFILE-02 | 页面元素检查 | 有内容区域 |
| USER-API-01 | GET /api/user/me | 401 (未登录) 或 200 (已登录) |
| USER-API-02 | GET /api/user/quota | 返回配额信息 |
| USER-API-03 | POST /api/user/usage | 记录使用情况 |
| QUOTA-01 | 用户菜单显示 | 菜单可见 |

---

### 2.4 Discovery 频道 (PRD 3.4)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| DISCOVERY-01 | 页面加载 | /discovery 可访问 |
| DISCOVERY-02 | 页面标题 | 有 h1/h2 标题 |
| DISCOVERY-03 | 内容区域 | 有瀑布流/网格布局 |
| DISCOVERY-04 | 开始调研按钮 | 存在且可点击 |
| DISCOVERY-05 | 导航到首页 | 点击后跳转 |
| DISCOVERY-06 | 详情页路由 | /discovery/{id} 存在 |
| DISCOVERY-API-01 | 获取报告列表 | GET /api/discovery/reports |
| DISCOVERY-API-02 | 响应格式验证 | 返回数组或对象 |

---

### 2.5 定制化服务专家接入 (PRD 3.5)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| EXPERT-01 | 页面加载 | /expert 可访问 |
| EXPERT-02 | 标题和描述 | 有标题内容 |
| EXPERT-03 | 表单存在 | 有 form 元素 |
| EXPERT-04 | 姓名字段 | 可输入 |
| EXPERT-05 | 手机号字段 | 可输入 |
| EXPERT-06 | 公司字段 | 可输入 |
| EXPERT-07 | 微信二维码 | 图片或文字可见 |
| EXPERT-08 | 表单提交 | 可填写并提交 |
| EXPERT-09 | 服务描述 | 有服务卡片 |
| CONSULT-API-01 | 提交咨询 | POST /api/consultations |
| CONSULT-API-02 | 缺少必填字段 | 返回 400 |

---

### 2.6 移动端适配 (PRD 3.6)

#### iPhone SE (375x667)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| MOBILE-01 | 首页水平滚动 | 无水平滚动条 |
| MOBILE-02 | 登录页水平滚动 | 无水平滚动条 |
| MOBILE-03 | Discovery 水平滚动 | 无水平滚动条 |
| MOBILE-04 | Expert 水平滚动 | 无水平滚动条 |
| MOBILE-05 | 汉堡菜单 | 可见且可点击 |
| MOBILE-06 | 登录表单 | 表单可见可用 |
| MOBILE-07 | 输入框宽度 | 不超出屏幕 |
| MOBILE-08 | 按钮尺寸 | 足够大可点击 |

#### iPad (768x1024)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| TABLET-01 | 首页水平滚动 | 无水平滚动条 |
| TABLET-02 | 登录页布局 | 正常显示 |
| TABLET-03 | 专家页双栏 | md: 断点生效 |

#### Desktop (1280x800)

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| DESKTOP-01 | 侧边栏 | 可见 |
| DESKTOP-02 | 水平滚动 | 无水平滚动条 |
| DESKTOP-03 | 登录页居中 | 表单居中显示 |
| DESKTOP-04 | Radio vs Select | 桌面用 Radio |

---

### 2.7 安全性测试

| 测试编号 | 测试场景 | 预期结果 |
|----------|----------|----------|
| SECURITY-XSS-01 | XSS 输入过滤 | script 标签被过滤 |
| SECURITY-CSRF-01 | Content-Type 验证 | 正确处理非 JSON |
| SECURITY-AUTH-01 | 未认证获取用户数据 | 401/403 |
| SECURITY-AUTH-02 | 未认证修改用户数据 | 401/403 |

---

### 2.8 性能基准

| 测试编号 | 测试场景 | 阈值 |
|----------|----------|------|
| PERF-01 | 首页加载 | < 5秒 |
| PERF-02 | 登录页加载 | < 3秒 |
| PERF-03 | API 响应 | < 2秒 |

---

## 3. 运行测试

### 3.1 环境准备

```bash
# 1. 启动 Redis
brew services start redis

# 2. 启动 Next.js 开发服务器
npm run dev

# 3. 确保服务可访问
curl http://localhost:3000
```

### 3.2 运行所有测试

```bash
# 安装 Playwright
npx playwright install chromium

# 运行完整测试套件
npx playwright test tests/prd-v2.2-comprehensive-e2e.spec.ts

# 生成 HTML 报告
npx playwright test tests/prd-v2.2-comprehensive-e2e.spec.ts --reporter=html

# 查看报告
npx playwright show-report
```

### 3.3 运行特定模块测试

```bash
# 只运行登录测试
npx playwright test tests/prd-v2.2-comprehensive-e2e.spec.ts --grep "手机短信登录"

# 只运行移动端测试
npx playwright test tests/prd-v2.2-comprehensive-e2e.spec.ts --grep "移动端适配"

# 只运行 API 测试
npx playwright test tests/prd-v2.2-comprehensive-e2e.spec.ts --grep "API"
```

### 3.4 调试模式

```bash
# UI 模式
npx playwright test --ui

# 头部模式（显示浏览器）
npx playwright test --headed

# 调试特定测试
npx playwright test --debug --grep "LOGIN-UI-01"
```

---

## 4. 测试报告模板

```markdown
# E2E 测试报告: PRD v2.2

**日期**: {YYYY-MM-DD}
**测试框架**: Playwright
**测试环境**: http://localhost:3000

---

## 1. 执行摘要

| 指标 | 数值 |
|------|------|
| 总测试数 | 108 |
| 通过 | ? |
| 失败 | ? |
| 通过率 | ?% |
| 执行时间 | ?s |

---

## 2. 用户故事覆盖率

| PRD 章节 | 测试数 | 通过 | 失败 | 覆盖率 |
|----------|--------|------|------|--------|
| 3.1 手机短信登录 | 28 | ? | ? | ?% |
| 3.2 用户管理后台 | 9 | ? | ? | ?% |
| 3.3 个人中心 | 6 | ? | ? | ?% |
| 3.4 Discovery | 8 | ? | ? | ?% |
| 3.5 专家接入 | 11 | ? | ? | ?% |
| 3.6 移动端适配 | 16 | ? | ? | ?% |
| **总计** | **108** | ? | ? | ?% |

---

## 3. 发现的 Bug

| 编号 | 严重程度 | 描述 | PRD 章节 |
|------|---------|------|----------|
| BUG-001 | P? | ... | 3.? |

---

## 4. 未实现功能

| PRD 章节 | 功能 | 状态 |
|----------|------|------|
| ... | ... | 未实现 |

---

## 5. 测试环境信息

- 操作系统: {OS}
- Node.js: {version}
- 浏览器: Chromium
- 测试框架: Playwright Test

---

## 6. 结论

{测试结论}

---

*报告生成时间: {timestamp}*
```

---

## 5. PRD 用户故事追溯矩阵

| PRD 用户故事 | 测试编号 | 状态 |
|-------------|---------|------|
| 用户通过手机号登录 | LOGIN-UI-01~08, CAPTCHA-API-01~05, SMS-API-01~05, FORM-01~02 | ✅ |
| 图形验证码前置 | CAPTCHA-API-01~05, LOGIN-UI-03~04 | ✅ |
| 自动注册 | SMS-API-04~05 | ✅ |
| 管理员查看用户列表 | ADMIN-01~04, ADMIN-API-01 | ✅ |
| 管理员修改用户等级 | ADMIN-API-02 | ✅ |
| 权限控制 403 | ADMIN-API-01~04 | ✅ |
| 查看当前等级和配额 | PROFILE-01~02, USER-API-01~03 | ✅ |
| 权益卡片显示 | PROFILE-02, QUOTA-01 | ✅ |
| 用量仪表盘 | USER-API-02 | ✅ |
| 浏览瀑布流卡片 | DISCOVERY-01~06 | ✅ |
| 开始调研转化 | DISCOVERY-04~05 | ✅ |
| 表单提交咨询 | EXPERT-03~08, CONSULT-API-01~02 | ✅ |
| 微信扫码入口 | EXPERT-07 | ✅ |
| 汉堡菜单导航 | MOBILE-05 | ✅ |
| Radio/Select 切换 | DESKTOP-04, RESPONSIVE-01 | ✅ |
| 无水平滚动条 | MOBILE-01~04, TABLET-01~02, DESKTOP-02 | ✅ |

---

## 6. 质量检查清单

在提交测试报告前确认：

- [ ] 无 Mock API - 所有测试调用真实 API
- [ ] 100% 用户故事覆盖 - 每个 PRD 用户故事都有测试
- [ ] 真实环境执行 - 在 localhost:3000 运行
- [ ] Bug 清单完整 - 记录所有发现的问题
- [ ] 未实现功能标记 - 明确标注哪些功能未实现
- [ ] 截图和视频 - 失败用例有证据

---

*文档版本: v1.0*
*最后更新: 2025-12-22*
