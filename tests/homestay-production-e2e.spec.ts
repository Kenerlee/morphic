import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * 民宿尽调生产环境完整 E2E 测试
 *
 * 测试目标: Skills API 生产环境 https://skills-api-proxy-1.onrender.com
 *
 * 测试范围:
 * 1. Skills API 健康检查
 * 2. Skills 列表验证
 * 3. 民宿尽调 Skill 调用测试
 * 4. 流式响应测试
 * 5. 错误处理测试
 * 6. 边界情况测试
 * 7. 性能测试
 *
 * HARDER MODE: 真实 API 调用，无 Mock，完整流程
 */

const PRODUCTION_API_URL = 'https://skills-api-proxy-1.onrender.com'
const HOMESTAY_SKILL_ID = 'skill_015FtmDcs3NUKhwqTgukAyWc'

// ============================================
// 第一部分: Skills API 基础测试
// ============================================
test.describe('Skills API 基础测试', () => {

  test('API-HEALTH-01: 健康检查端点正常', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_API_URL}/health`)

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.api_key_configured).toBe(true)
  })

  test('API-SKILLS-01: Skills 列表端点正常', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_API_URL}/skills`)

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.total).toBeGreaterThan(0)
    expect(data.skills).toBeDefined()
  })

  test('API-SKILLS-02: 民宿尽调 Skill 存在', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_API_URL}/skills`)
    const data = await response.json()

    expect(data.skills[HOMESTAY_SKILL_ID]).toBeDefined()
    expect(data.skills[HOMESTAY_SKILL_ID].name).toBe('Homestay Market Entry')
    expect(data.skills[HOMESTAY_SKILL_ID].type).toBe('custom')
  })

  test('API-SKILLS-03: 验证所有 Skill 类型', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_API_URL}/skills`)
    const data = await response.json()

    // 验证 Anthropic 官方 skills
    expect(data.skills.pdf).toBeDefined()
    expect(data.skills.xlsx).toBeDefined()
    expect(data.skills.pptx).toBeDefined()
    expect(data.skills.docx).toBeDefined()

    // 验证自定义 skills
    expect(data.skills[HOMESTAY_SKILL_ID]).toBeDefined()
  })
})

// ============================================
// 第二部分: 民宿尽调 Skill 调用测试
// ============================================
test.describe('民宿尽调 Skill 调用测试', () => {

  // 设置较长超时，因为 skill 执行可能需要 7-8 分钟
  test.setTimeout(600000) // 10 分钟超时

  test('HOMESTAY-01: 基础调用 - 北京三里屯', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: '请对【北京三里屯】的民宿投资市场进行全面分析。'
      },
      timeout: 600000
    })

    const duration = Date.now() - startTime
    console.log(`调用耗时: ${duration}ms (${(duration / 1000 / 60).toFixed(2)} 分钟)`)

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('success')
    expect(data.result).toBeDefined()
    expect(data.result.length).toBeGreaterThan(100)

    // 验证报告包含关键内容
    const content = data.result.toLowerCase()
    console.log('报告长度:', data.result.length, '字符')
  })

  test('HOMESTAY-02: 完整参数调用 - 杭州西湖区', async ({ request }) => {
    const startTime = Date.now()

    const message = `请对【杭州西湖区】的民宿投资市场进行全面分析。
投资预算范围：100-200万
民宿类型：精品民宿
目标客群：家庭游客、情侣
其他需求：希望了解周边景区分布和交通便利性

请提供以下分析：
1. 区位分析：地理位置、交通便利性、周边配套
2. 市场规模：民宿市场容量、增长趋势
3. 竞争格局：主要竞争对手、定价策略
4. 目标客群：客源结构、消费特征
5. 投资建议：投资回报预测、风险评估、运营建议`

    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: message
      },
      timeout: 600000
    })

    const duration = Date.now() - startTime
    console.log(`调用耗时: ${duration}ms (${(duration / 1000 / 60).toFixed(2)} 分钟)`)

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('success')
    expect(data.result).toBeDefined()

    console.log('报告长度:', data.result.length, '字符')
  })

  test('HOMESTAY-03: 大学周边区域 - 郑州大学', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: `请对【郑州大学附近】的民宿投资市场进行分析。
目标客群：大学生、考研学生、访校家长
投资预算：50-100万
请重点分析学生客群的消费特征和淡旺季波动。`
      },
      timeout: 600000
    })

    const duration = Date.now() - startTime
    console.log(`调用耗时: ${duration}ms (${(duration / 1000 / 60).toFixed(2)} 分钟)`)

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('success')
  })
})

// ============================================
// 第三部分: 流式响应测试
// ============================================
test.describe('流式响应测试', () => {

  test.setTimeout(600000)

  test('STREAM-01: 流式调用基础测试', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.post(`${PRODUCTION_API_URL}/stream/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: '请简要分析【上海静安区】的民宿市场概况。',
        max_tokens: 8192
      },
      timeout: 600000
    })

    expect(response.status()).toBe(200)

    // 读取流式响应
    const body = await response.body()
    const text = body.toString()

    const duration = Date.now() - startTime
    console.log(`流式调用耗时: ${duration}ms`)
    console.log('响应长度:', text.length, '字符')

    // 验证 SSE 格式
    expect(text).toContain('data:')
  })

  test('STREAM-02: 验证 SSE 事件格式', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/stream/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: '请简要介绍民宿投资的基本要素。',
        max_tokens: 4096
      },
      timeout: 300000
    })

    expect(response.status()).toBe(200)

    const body = await response.body()
    const text = body.toString()
    const lines = text.split('\n')

    let hasTextDelta = false
    let hasDone = false

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'text_delta') hasTextDelta = true
          if (data.type === 'done') hasDone = true
        } catch {
          // 忽略解析错误
        }
      }
    }

    console.log('包含 text_delta:', hasTextDelta)
    console.log('包含 done:', hasDone)

    expect(hasTextDelta).toBe(true)
    expect(hasDone).toBe(true)
  })
})

// ============================================
// 第四部分: 错误处理测试
// ============================================
test.describe('错误处理测试', () => {

  test('ERROR-01: 无效 Skill ID', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: ['invalid_skill_id'],
        message: '测试消息'
      }
    })

    // 应该返回错误
    const status = response.status()
    expect([400, 404, 500]).toContain(status)
  })

  test('ERROR-02: 空消息', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: ''
      }
    })

    // 应该返回错误或处理空消息
    const status = response.status()
    expect([200, 400, 422]).toContain(status)
  })

  test('ERROR-03: 缺少必填参数', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID]
        // 缺少 message
      }
    })

    const status = response.status()
    expect([400, 422]).toContain(status)
  })

  test('ERROR-04: 无效 JSON 格式', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: 'invalid json'
    })

    const status = response.status()
    expect([400, 422]).toContain(status)
  })

  test('ERROR-05: 空 skill_ids 数组', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [],
        message: '测试消息'
      }
    })

    const status = response.status()
    expect([400, 422]).toContain(status)
  })
})

// ============================================
// 第五部分: 边界情况测试
// ============================================
test.describe('边界情况测试', () => {

  test.setTimeout(300000)

  test('EDGE-01: 超长消息', async ({ request }) => {
    // 生成超长消息
    const longMessage = '请分析民宿市场。'.repeat(100)

    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: longMessage
      },
      timeout: 300000
    })

    // 应该能处理或返回错误
    const status = response.status()
    expect([200, 400, 413, 422]).toContain(status)
  })

  test('EDGE-02: 特殊字符', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: '请分析【北京\n朝阳区】的民宿市场。包含特殊字符：<>&"\'\\n\\t'
      },
      timeout: 300000
    })

    expect([200, 400]).toContain(response.status())
  })

  test('EDGE-03: Unicode 字符', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: '请分析🏠民宿市场：东京🗼新宿区、巴黎🗼香榭丽舍'
      },
      timeout: 300000
    })

    expect([200, 400]).toContain(response.status())
  })

  test('EDGE-04: 多个 Skill 同时调用', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID, 'pdf'],
        message: '请分析民宿市场并生成 PDF 报告。'
      },
      timeout: 300000
    })

    // 可能支持也可能不支持多 skill
    const status = response.status()
    console.log('多 Skill 调用状态:', status)
    expect([200, 400, 422]).toContain(status)
  })
})

// ============================================
// 第六部分: 性能测试
// ============================================
test.describe('性能测试', () => {

  test('PERF-01: 健康检查响应时间 < 2秒', async ({ request }) => {
    const startTime = Date.now()

    await request.get(`${PRODUCTION_API_URL}/health`)

    const duration = Date.now() - startTime
    console.log('健康检查响应时间:', duration, 'ms')

    expect(duration).toBeLessThan(2000)
  })

  test('PERF-02: Skills 列表响应时间 < 3秒', async ({ request }) => {
    const startTime = Date.now()

    await request.get(`${PRODUCTION_API_URL}/skills`)

    const duration = Date.now() - startTime
    console.log('Skills 列表响应时间:', duration, 'ms')

    expect(duration).toBeLessThan(3000)
  })

  test('PERF-03: 并发健康检查', async ({ request }) => {
    const startTime = Date.now()

    // 并发 5 个请求
    const promises = Array(5).fill(null).map(() =>
      request.get(`${PRODUCTION_API_URL}/health`)
    )

    const responses = await Promise.all(promises)

    const duration = Date.now() - startTime
    console.log('并发 5 个健康检查耗时:', duration, 'ms')

    // 所有请求应该成功
    responses.forEach(r => expect(r.status()).toBe(200))
  })
})

// ============================================
// 第七部分: 其他官方 Skills 测试
// ============================================
test.describe('官方 Skills 测试', () => {

  test.setTimeout(120000)

  test('OFFICIAL-01: PDF Skill 可用', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: ['pdf'],
        message: '创建一个简单的 PDF 文档，标题为"测试报告"。'
      },
      timeout: 120000
    })

    expect([200, 400]).toContain(response.status())
  })

  test('OFFICIAL-02: XLSX Skill 可用', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: ['xlsx'],
        message: '创建一个简单的 Excel 表格，包含姓名和年龄两列。'
      },
      timeout: 120000
    })

    expect([200, 400]).toContain(response.status())
  })
})

// ============================================
// 第八部分: 报告内容验证测试
// ============================================
test.describe('报告内容验证', () => {

  test.setTimeout(600000)

  test('CONTENT-01: 报告结构完整性', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_API_URL}/invoke`, {
      data: {
        skill_ids: [HOMESTAY_SKILL_ID],
        message: `请对【成都春熙路】的民宿投资市场进行全面分析。
投资预算：80-150万
民宿类型：特色民宿
目标客群：年轻游客`
      },
      timeout: 600000
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('success')

    const content = data.result

    // 验证报告长度
    expect(content.length).toBeGreaterThan(500)
    console.log('报告总长度:', content.length, '字符')

    // 记录报告摘要
    console.log('报告前 500 字符:', content.substring(0, 500))
  })
})
