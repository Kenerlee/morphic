# AINavix 智能咨询系统 - 研发交付级 PRD (v2.2)

| **项目属性** | **详细信息** |
| :--- | :--- |
| **项目名称** | AINavix 平台化与商业化升级 (Platform & Monetization) |
| **版本号** | **v2.2 (Release Candidate)** |
| **文档状态** | **Ready for Dev (待开发)** |
| **最后更新** | 2025-12-19 |
| **涉及端** | Web 端, H5 移动端, 后端 API |
| **核心目标** | 建立商业化等级体系，实现登录、权益管理、内容分发及全端适配。 |

---

## 1. 🎯 项目背景与目标
在保持现有 Agent 智能分析核心能力的基础上，系统需从单一工具转型为商业化平台。
* **降低门槛**：实现手机号+验证码登录，支持移动端自适应访问。
* **商业变现**：建立基于等级（Free/Pro/VIP）的配额管控体系。
* **内容生态**：通过 Discovery 频道沉淀优质案例，促进二次转化。

---

## 2. 👥 用户角色与权益体系 (RBAC)

系统定义以下角色及对应的权益逻辑：

| 等级 (Enum) | 代号 | 权益描述 | 剩余次数逻辑 (Quota) | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **注册会员** | `Free` | 仅在线预览，免费试用 2-3 次 | `quota_limit` = 3 (总量) | 默认注册等级 |
| **高级会员** | `Pro` | 支持导出报告，深度搜索 | `quota_limit` = 20 (月度重置) | 付费 199/月 |
| **VIP 会员** | `VIP` | 优先算力，多语言深度溯源 | `quota_limit` = 100 (月度重置) | 付费 1999/月 |
| **管理员** | `Admin` | 系统管理权限，查看所有数据 | `quota_limit` = -1 (无限制) | 内部账号 |

---

## 3. 🚀 功能需求与用户故事 (User Stories)

### 3.1 鉴权模块：手机短信登录
* **User Story**: 用户通过输入手机号、图形验证码、短信验证码完成登录。若手机号未注册，系统自动创建账户并赋予初始等级。
* **功能验收标准**:
    1.  **图形验证码前置**: 调用短信接口前必须校验图形验证码，防止 SMS 接口被恶意盗刷。
    2.  **自动注册**: 验证通过后，若 DB 中无此 `mobile`，则自动 `INSERT` 用户记录并设置 `level='Free'`。
    3.  **会话保持**: Token 需支持 PC 和 Mobile 端同时在线。

### 3.2 用户管理后台 (Admin Only)
* **User Story**: 管理员在后台查看用户列表，支持搜索用户并手动修改其等级；普通用户无权访问。
* **功能验收标准**:
    1.  **权限控制**: `/admin/*` 路由仅对 `role='admin'` 开放，其他角色访问返回 403。
    2.  **等级修改**: 修改立即生效，直接影响该用户的下一次 Agent 调用。

### 3.3 个人中心：权益看板
* **User Story**: 用户在设置页查看当前等级、有效期及剩余次数。
* **UI 需求**:
    * **权益卡片**: 列表展示当前等级支持的功能（如：PDF 导出、API 调用）。
    * **用量仪表盘**: 实时显示 `used_quota / quota_limit`（例如：本月已用 3/20 次）。

### 3.4 内容分发：Discovery 频道
* **User Story**: 用户浏览瀑布流卡片形式的公共调研报告，以了解系统能力。
* **UI 需求**:
    * **卡片设计**: 封面图 + 行业标签 + 核心结论摘要。
    * **转化引导**: 页面右上角常驻 "开始我的调研 (Start Research)" 按钮，点击跳转新建任务页。

### 3.5 定制化服务：专家接入
* **User Story**: 提供表单提交和微信扫码入口，承接复杂非标需求。
* **功能点**: 左侧导航新增“定制化调研”入口，右侧常驻客服二维码。

### 3.6 移动端适配 (Responsive UX)
* **User Story**: 手机访问时，系统布局自动调整，复杂交互简化。
* **适配规则**:
    * **导航**: 侧边栏改为汉堡菜单 (Hamburger Menu)。
    * **表单组件转换**: PC 端的 Radio Group (平铺单选) 在移动端 (`<768px`) 自动渲染为 Select Dropdown (下拉选择)。

---

## 4. ⚙️ 技术规格说明 (Technical Specs)

### 4.1 数据库 Schema 变更 (MySQL/PostgreSQL)
在 `users` 表中扩展以下核心字段：

```sql
ALTER TABLE users ADD COLUMN (
    mobile VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号',
    level ENUM('Free', 'Pro', 'VIP') DEFAULT 'Free' COMMENT '会员等级',
    role ENUM('user', 'admin', 'support') DEFAULT 'user' COMMENT '系统角色',
    quota_limit INT DEFAULT 3 COMMENT '总配额 (-1为无限)',
    quota_used INT DEFAULT 0 COMMENT '已用配额',
    quota_reset_date DATETIME COMMENT '配额重置日期',
    level_expire_at DATETIME COMMENT '会员过期时间'
);

4.2 核心 API 定义研发需遵循以下 RESTful 接口规范：方法路径描述权限要求POST/api/auth/captcha获取/校验图形验证码PublicPOST/api/auth/sms/send发送短信 (需带 captcha_token)PublicPOST/api/auth/login手机号+验证码登录/注册PublicGET/api/user/me获取个人信息 (含 level, quota)UserPOST/api/agent/task核心业务: 发起调研 (触发扣费)User (需有配额)GET/api/admin/users获取用户列表Admin OnlyPUT/api/admin/users/{id}/level修改用户等级Admin Only4.3 错误码标准 (Error Codes)前端需根据 code 进行特定 UI 交互：错误码描述前端行为200Success正常展示40101Invalid Captcha提示“图形验证码错误”并刷新图片40201Quota Exceeded弹出付费引导弹窗40301Forbidden (Admin)跳转至首页或显示无权限页5. 🧪 TDD 测试驱动开发脚本 (Testing Scenarios)以下脚本逻辑需在开发阶段转化为单元测试代码 (Pytest/Jest)。场景 A：配额拦截中间件 (Quota Middleware)目标: 确保无配额用户无法调用 Agent 资源。Python# tests/test_quota_middleware.py

def test_pro_user_consumption(client, db_session):
    # 1. 模拟 Pro 用户，剩余配额 1
    user = UserFactory(level="Pro", quota_limit=20, quota_used=19)
    
    # 2. 发起第 20 次请求 -> 预期成功
    response = client.post("/api/agent/task", json={"task": "analysis"}, user=user)
    assert response.status_code == 200
    assert user.quota_used == 20  # DB 必须更新

    # 3. 发起第 21 次请求 -> 预期失败 (被拦截)
    response_over = client.post("/api/agent/task", json={"task": "analysis"}, user=user)
    assert response_over.status_code == 402  # Payment Required
    assert response_over.json()['error_code'] == 40201
场景 B：移动端组件自适应目标: 验证视口检测与组件渲染逻辑。JavaScript// tests/frontend/test_responsive_form.js

test('renders Select dropdown on mobile viewport', () => {
  // 1. 设置视口宽度为 iPhone SE (375px)
  global.innerWidth = 375;
  window.dispatchEvent(new Event('resize'));
  
  // 2. 渲染调研表单组件
  const { container } = render(<ResearchFormOptions />);
  
  // 3. 断言：应存在 Select 元素，且不存在 Radio Group
  expect(container.querySelector('select')).toBeInTheDocument();
  expect(container.querySelector('input[type="radio"]')).not.toBeInTheDocument();
});

test('renders Radio group on desktop viewport', () => {
  // 1. 设置视口宽度为 Desktop (1024px)
  global.innerWidth = 1024;
  window.dispatchEvent(new Event('resize'));
  
  const { container } = render(<ResearchFormOptions />);
  
  expect(container.querySelector('input[type="radio"]')).toBeInTheDocument();
});
场景 C：管理员权限越权测试目标: 确保普通用户无法通过 API 提权。Python# tests/test_admin_security.py

def test_user_cannot_modify_level(client):
    attacker = UserFactory(role="user")
    target_user = UserFactory(id=999, level="Free")
    
    # 尝试调用管理员接口修改等级
    response = client.put(f"/api/admin/users/{target_user.id}/level", 
                          json={"level": "VIP"}, 
                          headers=auth_headers(attacker))
    
    # 断言：禁止访问
    assert response.status_code == 403
    
    # 断言：数据库数据未被篡改
    db_target = User.get(999)
    assert db_target.level == "Free" 
6. 📅 交付标准 (Definition of Done)功能完备: 所有 User Stories 通过 QA 验收。单元测试: 核心逻辑（配额、鉴权）的测试覆盖率 > 90%。多端兼容: PC 端 (Chrome/Safari) 与 Mobile 端 (iOS/Android) 布局正常，无水平滚动条。安全合规: 短信接口具备频控（单 IP 限制、单手机号限制）。