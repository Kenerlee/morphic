import nodemailer from 'nodemailer'

// Feishu SMTP 配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.feishu.cn',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // 使用 SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

/**
 * 发送邮件
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html } = options

  const mailOptions = {
    from: `"NaviX 摸摸底" <${process.env.SMTP_USER || 'info@moments.top'}>`,
    to,
    subject,
    text,
    html,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('[Email] Message sent:', info.messageId)
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    throw error
  }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const subject = '重置您的 NaviX 密码'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">NaviX 摸摸底</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI驱动的出海市场研究平台</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">重置您的密码</h2>

    <p>您好，</p>

    <p>我们收到了重置您 NaviX 账户密码的请求。点击下方按钮重置密码：</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 500;">重置密码</a>
    </div>

    <p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器中打开：</p>
    <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>

    <p style="color: #666; font-size: 14px;">此链接将在 1 小时后失效。</p>

    <p style="color: #999; font-size: 13px; margin-top: 30px;">如果您没有请求重置密码，请忽略此邮件。您的账户安全不会受到影响。</p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>此邮件由 NaviX 系统自动发送，请勿直接回复。</p>
    <p>&copy; ${new Date().getFullYear()} NaviX 摸摸底. All rights reserved.</p>
  </div>
</body>
</html>
`

  const text = `
重置您的 NaviX 密码

您好，

我们收到了重置您 NaviX 账户密码的请求。请点击以下链接重置密码：

${resetUrl}

此链接将在 1 小时后失效。

如果您没有请求重置密码，请忽略此邮件。

NaviX 摸摸底
AI驱动的出海市场研究平台
`

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}

/**
 * 验证 SMTP 连接
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('[Email] SMTP connection verified')
    return true
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error)
    return false
  }
}
