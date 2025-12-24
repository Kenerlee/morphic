"""
测试 Railway 对 WebSocket 的超时策略
使用真正的 WebSocket 连接来测试
"""

import asyncio
import json
import websockets
import ssl

# LiteLLM Proxy 配置
LITELLM_API_KEY = "sk-0kMWU6LVas6lrj_UYIIM8g"
# 将 https 改为 wss 来测试 WebSocket
LITELLM_WS_URL = "wss://llm.moments.top/v1/realtime"
MODEL = "claude-sonnet-4-5"


async def test_websocket_connection():
    """测试 WebSocket 连接是否可用"""
    print("=" * 70)
    print("  测试 Railway WebSocket 连接")
    print("=" * 70)

    # 构建 WebSocket URL
    ws_url = f"{LITELLM_WS_URL}?model={MODEL}"

    print(f"\nWebSocket URL: {ws_url}")

    headers = {
        "Authorization": f"Bearer {LITELLM_API_KEY}",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
    }

    ssl_context = ssl.create_default_context()

    try:
        print("\n尝试建立 WebSocket 连接...")

        async with websockets.connect(
            ws_url,
            additional_headers=headers,
            ssl=ssl_context,
            ping_interval=30,  # 每30秒发送 ping
            ping_timeout=60,
            close_timeout=10
        ) as websocket:
            print("✅ WebSocket 连接成功!")

            # 测试保持连接
            print("\n测试连接保持时间...")
            for i in range(20):  # 测试 10 分钟
                await asyncio.sleep(30)
                print(f"  已保持连接 {(i+1)*30} 秒...")

                # 发送 ping
                try:
                    pong = await websocket.ping()
                    await asyncio.wait_for(pong, timeout=10)
                    print(f"    Ping/Pong 成功")
                except Exception as e:
                    print(f"    Ping 失败: {e}")
                    break

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"\n❌ WebSocket 连接失败: HTTP {e.status_code}")
        print(f"   可能 LiteLLM 不支持此 WebSocket 端点")

    except websockets.exceptions.InvalidURI as e:
        print(f"\n❌ 无效的 WebSocket URI: {e}")

    except Exception as e:
        print(f"\n❌ 连接错误: {type(e).__name__}: {e}")


async def test_http_keep_alive():
    """测试 HTTP Keep-Alive 连接时长"""
    import aiohttp

    print("\n" + "=" * 70)
    print("  测试 HTTP Keep-Alive 连接时长")
    print("=" * 70)

    url = f"https://llm.moments.top/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LITELLM_API_KEY}",
        "Connection": "keep-alive"
    }

    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": "请慢慢数数，从1数到1000，每个数字之间停顿一下"}],
        "max_tokens": 16384,
        "stream": True
    }

    timeout = aiohttp.ClientTimeout(total=900)

    try:
        start_time = asyncio.get_event_loop().time()

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, json=payload) as response:
                print(f"\n状态码: {response.status}")

                if response.status != 200:
                    error = await response.text()
                    print(f"错误: {error}")
                    return

                chunk_count = 0
                last_output_time = start_time

                async for line in response.content:
                    current_time = asyncio.get_event_loop().time()
                    elapsed = current_time - start_time

                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        chunk_count += 1

                        # 每10秒输出一次状态
                        if current_time - last_output_time >= 10:
                            print(f"  已运行 {elapsed:.0f}s, 收到 {chunk_count} 个数据块")
                            last_output_time = current_time

                        if line[6:] == "[DONE]":
                            print(f"\n✅ 完成! 总时长: {elapsed:.0f}s")
                            break

    except asyncio.TimeoutError:
        elapsed = asyncio.get_event_loop().time() - start_time
        print(f"\n⏱️ 超时断开，连接持续了 {elapsed:.0f}s")

    except aiohttp.ClientError as e:
        elapsed = asyncio.get_event_loop().time() - start_time
        print(f"\n❌ 连接断开: {type(e).__name__}: {e}")
        print(f"   连接持续了 {elapsed:.0f}s")

    except Exception as e:
        elapsed = asyncio.get_event_loop().time() - start_time
        print(f"\n❌ 错误: {type(e).__name__}: {e}")
        print(f"   连接持续了 {elapsed:.0f}s")


async def main():
    # 先测试 WebSocket
    await test_websocket_connection()

    # 再测试 HTTP Keep-Alive
    await test_http_keep_alive()


if __name__ == "__main__":
    asyncio.run(main())
