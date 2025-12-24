# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NaviX (摸摸底/MoMoDi) is an AI-driven market research and analysis platform for Chinese companies expanding globally. Built on Next.js with React Server Components, it provides intelligent decision support through AI-powered search, market due diligence, and deep research capabilities.

## Development Commands

This project uses **Bun** as the package manager and runtime (required version: 1.2.12). Install from [bun.sh](https://bun.sh).

## Production Server Access

To connect to the production server:

```bash
ssh -p 2222 -i "/Users/xxXxx/GenAI2025/NaviX/mmd1123.pem" navix@14.103.19.204
```

- **Domain**: https://m.moments.top
- **IP**: 14.103.19.204
- **User**: navix
- **SSH Port**: 2222
- **Key**: `/Users/xxXxx/GenAI2025/NaviX/mmd1123.pem`
- **Path**: `/var/www/navix`

### First-time Setup

首次运行前，需要创建环境配置文件：

```bash
# 从项目根目录运行
cp .env.local.example .env.local
```

`.env.local` 文件包含所有必需的 API 密钥（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`TAVILY_API_KEY` 等），Skills API 也会自动读取此文件。

### Starting All Services

启动完整开发环境（三个服务）：

```bash
# Terminal 1: Start Redis (if not already running)
brew services start redis        # 或: redis-server (前台运行)

# Terminal 2: Start Next.js development server (from project root)
npm run dev          # Or: bun dev (if bun is installed)

# Terminal 3: Start Skills API server (from project root)
cd SkillsApi && source venv/bin/activate && python skills_api.py
```

**服务启动后：**
- Redis: localhost:6379
- Next.js: http://localhost:3000
- Skills API: http://localhost:8000

**Important Notes:**
- Redis 用于存储聊天历史，需要先启动（已设置开机自启）
- Skills API 会自动从父目录读取 `.env.local` 文件中的 `ANTHROPIC_API_KEY`，无需单独配置
- 如果需要覆盖配置，可以在 `SkillsApi/.env` 中设置（优先级更高）
- 必须从项目根目录启动 Skills API，以确保能正确读取父目录的环境变量

**Quick restart all services:**
```bash
# Stop all services
brew services stop redis 2>/dev/null || true       # Stop Redis
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # Kill Next.js dev server
lsof -ti:8000 | xargs kill -9 2>/dev/null || true  # Kill Skills API

# Start all services (run from project root directory)
brew services start redis                           # Start Redis
npm run dev &                                       # Start Next.js in background
cd SkillsApi && source venv/bin/activate && python skills_api.py &  # Start Skills API
```

**Check service status:**
```bash
redis-cli ping                    # Should return: PONG
curl -s http://localhost:3000     # Next.js health check
curl -s http://localhost:8000/health  # Skills API health check
```

### Core Commands
```bash
bun install          # Install dependencies
bun dev              # Start development server with Turbo
bun build            # Build production bundle
bun start            # Start production server
bun lint             # Run ESLint
bun run typecheck    # Type check without emitting
bun run format       # Format code with Prettier
bun run format:check # Check formatting
```

### Docker
```bash
docker compose up -d  # Start with Docker
```

## Architecture

### Tech Stack

**Core Framework:**
- Next.js 15+ with App Router and React Server Components
- React 19
- TypeScript with strict mode
- Tailwind CSS + shadcn/ui components (Radix UI primitives)

**AI & Streaming:**
- Vercel AI SDK (ai package) - Unified API for LLM providers with tool calling and streaming
- Multiple AI providers via @ai-sdk/* packages

**Editor:**
- Tiptap - Rich text editor for report generation with extensions for tables, images, formatting

**Authentication & Data Persistence:**
- Better Auth (auth) - Email/password + phone SMS login + invite codes
- Redis (sessions + chat history) - Required for auth, optional for chat history
- nodemailer (SMTP) - Password reset emails via Feishu SMTP

### AI Agent System

The application uses a multi-agent architecture for different research modes:

1. **Researcher Agent** ([lib/agents/researcher.ts](lib/agents/researcher.ts))
   - Default agent for general queries
   - Tools: search, retrieve, video search, market due diligence, question clarification
   - Uses tool calling with native AI SDK tool execution
   - Responds in Simplified Chinese by default

2. **Market Due Diligence Agent** ([lib/agents/market-due-diligence-agent.ts](lib/agents/market-due-diligence-agent.ts))
   - Specialized for comprehensive market analysis
   - Generates structured reports with executive summaries, market sizing, competitive landscape
   - Triggered when `dueDiligenceMode` is enabled

3. **Deep Research Agent** ([lib/agents/deep-researcher.ts](lib/agents/deep-researcher.ts))
   - Multi-step research with up to 4 research iterations
   - Performs trend analysis and comprehensive information gathering
   - Triggered when `deepResearchMode` is enabled

### Streaming Architecture

The application uses two distinct streaming approaches:

- **Tool Calling Stream** ([lib/streaming/create-tool-calling-stream.ts](lib/streaming/create-tool-calling-stream.ts))
  - For agents that use AI SDK's native tool calling (researcher, deep researcher, market due diligence)
  - Handles automatic tool execution and response streaming

- **Manual Tool Stream** ([lib/streaming/create-manual-tool-stream.ts](lib/streaming/create-manual-tool-stream.ts))
  - For manual research mode where users explicitly select tools
  - Directly invokes tool execution without LLM orchestration

### Search Provider System

Pluggable search architecture with multiple providers ([lib/tools/search/providers/](lib/tools/search/providers/)):

- **Tavily** (default): General web search
- **SearXNG**: Self-hosted meta-search engine with advanced depth control
- **Exa**: Neural search with semantic understanding
- **Firecrawl**: Web crawling with LLM-ready content extraction

Provider selection via `SEARCH_API` environment variable. All providers implement a base interface for consistent tool integration.

### Advanced Search with SearXNG

The [app/api/advanced-search/route.ts](app/api/advanced-search/route.ts) endpoint provides enhanced search capabilities:

**Features:**
- **Redis caching**: 1-hour TTL for search results with automatic cleanup
- **Web crawling**: Extracts full page content using JSDOM
- **Relevance scoring**: Ranks results by query term frequency, title matches, content freshness, and length
- **Domain filtering**: Include/exclude specific domains
- **Search depth**: "basic" (standard results) or "advanced" (crawls and scores top results)
- **Content quality filtering**: Validates extracted content for word count, sentence structure
- **Metadata extraction**: Captures publication dates, OG tags, meta descriptions

**Configuration:**
- `SEARXNG_MAX_RESULTS`: Maximum results to fetch (default: 50, max: 100)
- `SEARXNG_CRAWL_MULTIPLIER`: Number of extra results to crawl in advanced mode (default: 4)
- `SEARXNG_DEFAULT_DEPTH`: Default search depth (basic/advanced)

### Model Registry

Models are configured in [public/config/models.json](public/config/models.json) and loaded dynamically:

- Each model specifies `toolCallType` ("native" or "manual")
- Supports OpenAI, Anthropic, Google, Azure OpenAI, Groq, Ollama, DeepSeek, Fireworks, xAI
- Registry pattern in [lib/utils/registry.ts](lib/utils/registry.ts) handles model instantiation
- Reasoning models (DeepSeek R1, o1, o3) detected via `isReasoningModel()` helper
- Reasoning models use `extractReasoningMiddleware` to expose thought process
- Some models specify `toolCallModel` (e.g., deepseek-reasoner uses deepseek-chat for tools)

### Authentication & Data Storage

- **Better Auth**: User authentication framework (migrated from Supabase)
  - Email/password login with password reset via email
  - Phone number login with SMS OTP (Aliyun SMS)
  - Invite code system for user registration
  - Auth configuration in [lib/auth/](lib/auth/)
  - API routes: `/api/auth/[...all]` handles all auth endpoints
  - Session management in middleware.ts via cookie-based sessions

- **Redis**: Session storage and chat history persistence
  - Sessions stored in Redis for fast authentication (<10ms vs Supabase's 330ms-2.7s)
  - Local Redis for development: `redis://localhost:6379`
  - Upstash Redis option for serverless deployments

- **SMTP Email**: Password reset emails via Feishu SMTP
  - Configuration in [lib/email/smtp.ts](lib/email/smtp.ts)
  - Uses `info@moments.top` as sender

### Internationalization

- Next-intl for i18n with Chinese (default) and English
- Locale stored in cookies, messages in [messages/](messages/) directory (zh.json, en.json)
- All AI agents default to Simplified Chinese unless explicitly requested otherwise
- When adding new features, ensure i18n strings exist in both zh.json and en.json

### Report Generation

The application generates structured market research reports:

- Report creation in [lib/actions/report.ts](lib/actions/report.ts)
- Export formats: PDF and Word (enhanced versions with formatting)
- Export utilities: [lib/utils/export-enhanced-pdf.ts](lib/utils/export-enhanced-pdf.ts), [lib/utils/export-enhanced-word.ts](lib/utils/export-enhanced-word.ts)

### Context Window Management

[lib/utils/context-window.ts](lib/utils/context-window.ts) implements message truncation:

- Model-specific max token limits
- Preserves system message and recent user messages
- Truncates from middle of conversation history to stay within limits

## Configuration

### Required Environment Variables

Core functionality requires these environment variables:

```bash
# AI Providers
OPENAI_API_KEY=        # Primary AI provider
TAVILY_API_KEY=        # Default search provider

# Authentication (Better Auth)
BETTER_AUTH_SECRET=    # Session encryption (generate: openssl rand -base64 32)
USE_LOCAL_REDIS=true   # Use local Redis for sessions
LOCAL_REDIS_URL=redis://localhost:6379

# Phone Login (Aliyun SMS)
ALIYUN_SMS_ACCESS_KEY_ID=
ALIYUN_SMS_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=

# Password Reset (SMTP)
SMTP_HOST=smtp.feishu.cn
SMTP_PORT=465
SMTP_USER=info@moments.top
SMTP_PASSWORD=
```

Copy `.env.local.example` to `.env.local` and fill in these values to get started.

### Optional LLM Proxy

```bash
OPENAI_BASE_URL=       # Custom proxy for OpenAI API
ANTHROPIC_BASE_URL=    # Custom proxy for Anthropic API
```

### Optional Features

- **Chat History**: Set `ENABLE_SAVE_CHAT_HISTORY=true` and configure Redis
- **Alternative Search**: Set `SEARCH_API=searxng|exa|firecrawl`
- **Additional AI Providers**: Add corresponding API keys for Google AI, Anthropic, Groq, etc.
- **Video Search**: Requires `SERPER_API_KEY`
- **Sharing**: Enable with `NEXT_PUBLIC_ENABLE_SHARE=true`

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for complete configuration details.

## Key Implementation Patterns

### Agent Selection Logic

The chat API route ([app/api/chat/route.ts](app/api/chat/route.ts)) selects the appropriate agent based on mode flags:

- `deepResearchMode` → Deep Research Agent
- `dueDiligenceMode` → Market Due Diligence Agent (auto-selects Claude Sonnet 4+ if available)
- `searchMode=manual` → Manual Tool Stream
- Default → Researcher Agent

Mode flags are stored in cookies and read by the chat API. The model selection is also stored in cookies.

**Default Model**: DeepSeek V3 (deepseek-chat) is used as fallback when no model is selected or when model parsing fails.

### Tool Execution Flow

1. User message arrives at chat API
2. Agent selection based on mode
3. Messages converted to CoreMessages and truncated for context window
4. Stream initiated with selected agent configuration
5. AI invokes tools (search, retrieve, market_due_diligence, etc.)
6. Tool results integrated into response stream
7. Final answer streamed back to client with citations

### Citation Format

All AI responses include source citations using `[number](url)` markdown format. Multiple sources for the same claim are separated by commas. This is enforced in the agent system prompts.

## API Endpoints

### Core Endpoints
- `POST /api/chat` - Main chat/streaming endpoint
- `GET /api/chat/[id]` - Get specific chat
- `GET /api/chats` - List all chats for user
- `POST /api/reports` - Create/manage research reports
- `GET /api/reports/[id]` - Get specific report
- `GET /api/config/models` - Get available AI models
- `GET /api/ollama/models` - List Ollama models (if enabled)
- `POST /api/advanced-search` - Advanced search with SearXNG (includes caching, crawling, relevance scoring)

## SkillsApi Integration

The repository includes a standalone Python-based Skills API service in the [SkillsApi/](SkillsApi/) directory:

### Purpose
- Provides a FastAPI-based API server for calling Anthropic Skills
- Implements 5 QPS rate limiting based on client IP
- Supports both official Anthropic skills (pdf, xlsx, pptx, docx) and custom skills

### Running the Skills API

```bash
# 从项目根目录运行
cd SkillsApi && source venv/bin/activate && python skills_api.py
# 服务启动在 http://localhost:8000
```

### Skills API Endpoints
- `GET /skills` - List all available skills
- `POST /invoke` - Invoke one or more skills with a message

### Configuration
- **环境变量**: Skills API 会自动按以下顺序加载环境变量：
  1. 首先从项目根目录的 `.env.local` 读取（与主项目共享 `ANTHROPIC_API_KEY`）
  2. 然后从 `SkillsApi/.env` 读取（可覆盖上述配置）
- **必需**: `ANTHROPIC_API_KEY` 必须在 `.env.local` 或 `SkillsApi/.env` 中配置
- Rate limiting: 5 requests per second per IP
- Dependencies: FastAPI, Uvicorn, Anthropic SDK, SlowAPI

See [SkillsApi/README.md](SkillsApi/README.md) for detailed documentation.

### Production Proxy Architecture (生产环境代理架构)

由于生产服务器位于中国，无法直接访问 Anthropic API，因此采用双代理架构：

**架构图：**
```
用户 → NaviX(中国服务器) → llm.moments.top(代理) → Anthropic API
                ↓                                   (Claude 对话)
                ↓
                → skills-api-proxy-1.onrender.com → Anthropic API
                                                    (Skills 执行)
```

**两个代理服务：**

| 服务 | URL | 用途 | API Key |
|------|-----|------|---------|
| **LLM Proxy** | `https://llm.moments.top/v1` | NaviX 的 Claude 对话（问题收集阶段） | llm.moments.top 统一 key |
| **Skills API** | `https://skills-api-proxy-1.onrender.com` | 长时间运行的 Skills 执行（民宿尽调分析） | 原始 Anthropic key |

**生产环境配置 (`/var/www/navix/.env.local`)：**
```bash
# LLM Proxy 配置 - 用于 Claude 对话
ANTHROPIC_API_KEY=<llm.moments.top 统一 key>
ANTHROPIC_BASE_URL=https://llm.moments.top/v1

# Skills API 配置 - 用于长时间 Skills 执行
SKILLS_API_URL=https://skills-api-proxy-1.onrender.com
```

**为什么需要两个代理：**
1. **llm.moments.top**: 用于常规 Claude API 调用（对话、问答），使用其统一 API key
2. **skills-api-proxy-1.onrender.com**: 专门处理 Anthropic Skills 调用，支持长达 10 分钟的执行时间，使用原始 Anthropic API key，部署在 Render.com 上

**注意事项：**
- 两个服务使用**独立的 API key**，互不影响
- Skills API 在 Render Dashboard 中单独配置环境变量
- `llm.moments.top` 的统一 key 同时支持 OpenAI 和 Anthropic 调用

## File Organization

- **app/**: Next.js App Router structure
  - `api/chat`: Main chat endpoint
  - `api/reports`: Report management
  - `market-research/`: Market research UI
  - `auth/`: Authentication pages
- **components/**: React components organized by feature
  - `ui/`: shadcn/ui components
  - `sidebar/`: Navigation and history
  - `artifact/`: Report artifact display
- **lib/**: Core business logic
  - `agents/`: AI agent implementations
  - `tools/`: Tool definitions for search, research, etc.
  - `streaming/`: Stream handling logic
  - `utils/`: Shared utilities
- **public/config/**: Runtime configuration files (models.json)
- **SkillsApi/**: Python FastAPI service for Anthropic Skills (separate from main Next.js app)

## Testing & Quality

The codebase uses:
- TypeScript with strict mode
- ESLint with simple-import-sort plugin
- Prettier for code formatting
- Type checking via `bun run typecheck`

## Development Guidelines

When adding new features:

### Adding AI Agents
- Place agent definitions in [lib/agents/](lib/agents/)
- Define system prompts and tool configurations
- Return config compatible with `streamText` from Vercel AI SDK
- Update agent selection logic in [app/api/chat/route.ts](app/api/chat/route.ts)

### Adding Tools
- Create tool definition in [lib/tools/](lib/tools/)
- Define schema using Zod for type safety
- Implement execute function with proper error handling
- Register tool in relevant agent configurations
- For search providers, implement base interface in [lib/tools/search/providers/](lib/tools/search/providers/)

### Adding AI Models
- Update [public/config/models.json](public/config/models.json) with new model entry
- Specify `toolCallType` as "native" or "manual"
- If using a new provider, add API key to environment variables
- Add provider to registry in [lib/utils/registry.ts](lib/utils/registry.ts) if needed
- For reasoning models, add to `isReasoningModel()` helper

### Internationalization
- Add translation keys to both [messages/zh.json](messages/zh.json) and [messages/en.json](messages/en.json)
- Use `useTranslations()` hook in components
- Keep AI agent responses in Chinese unless explicitly requested otherwise
