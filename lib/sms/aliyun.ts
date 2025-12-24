import crypto from 'crypto'

// 阿里云短信配置
const config = {
  accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
  signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
}

/**
 * 阿里云签名算法
 */
function sign(accessKeySecret: string, stringToSign: string): string {
  return crypto
    .createHmac('sha1', accessKeySecret + '&')
    .update(stringToSign)
    .digest('base64')
}

/**
 * URL 编码（符合阿里云规范）
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

/**
 * 发送阿里云短信
 */
export async function sendAliyunSMS(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  if (!config.accessKeyId || !config.accessKeySecret) {
    console.error('阿里云短信配置缺失')
    return { success: false, message: '短信服务未配置' }
  }

  if (!config.signName || !config.templateCode) {
    console.error('短信签名或模板未配置')
    return { success: false, message: '短信模板未配置' }
  }

  // 清理手机号
  const cleanPhone = phone.replace(/^\+86/, '').replace(/\D/g, '')

  const params: Record<string, string> = {
    AccessKeyId: config.accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: cleanPhone,
    RegionId: 'cn-hangzhou',
    SignName: config.signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: config.templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  }

  // 按字母排序参数并编码
  const sortedKeys = Object.keys(params).sort()
  const canonicalizedQueryString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')

  // 构建待签名字符串
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalizedQueryString)}`

  // 生成签名
  const signature = sign(config.accessKeySecret, stringToSign)

  try {
    // 发送请求
    const response = await fetch('https://dysmsapi.aliyuncs.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `${canonicalizedQueryString}&Signature=${percentEncode(signature)}`,
    })

    const result = await response.json()

    if (result.Code === 'OK') {
      return {
        success: true,
        message: '发送成功',
        requestId: result.RequestId,
      }
    } else {
      console.error('阿里云短信发送失败:', result)
      return {
        success: false,
        message: getErrorMessage(result.Code) || result.Message || '发送失败',
      }
    }
  } catch (error) {
    console.error('阿里云短信请求错误:', error)
    return {
      success: false,
      message: '网络请求失败',
    }
  }
}

/**
 * 错误码映射
 */
function getErrorMessage(code: string): string | null {
  const errorMessages: Record<string, string> = {
    'isv.BUSINESS_LIMIT_CONTROL': '短信发送频率过高，请稍后再试',
    'isv.MOBILE_NUMBER_ILLEGAL': '手机号格式不正确',
    'isv.TEMPLATE_MISSING_PARAMETERS': '短信模板参数缺失',
    'isv.INVALID_PARAMETERS': '参数错误',
    'isv.MOBILE_COUNT_OVER_LIMIT': '手机号数量超限',
    'isv.AMOUNT_NOT_ENOUGH': '账户余额不足',
    'isv.PRODUCT_UNSUBSCRIBE': '短信服务未开通',
  }
  return errorMessages[code] || null
}

/**
 * 生成6位随机验证码
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidChinesePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/^\+86/, '').replace(/\D/g, '')
  return /^1[3-9]\d{9}$/.test(cleanPhone)
}

/**
 * 格式化手机号为纯数字
 */
export function formatPhone(phone: string): string {
  return phone.replace(/^\+86/, '').replace(/\D/g, '')
}
