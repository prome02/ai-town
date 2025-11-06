#!/usr/bin/env python3
"""
LLM 角色扮演評估程式使用範例
展示如何以程式方式使用此評估工具
"""

import asyncio
import sys
from pathlib import Path

# 添加專案路徑到 Python 路徑
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from config import config
from evaluator import RoleplayTestRunner
from prompts import get_all_scenarios

async def example_single_scenario_test():
    """單一場景測試範例"""
    print("=== 單一場景測試範例 ===")
    
    # 建立測試執行器
    test_runner = RoleplayTestRunner()
    
    # 執行歷史人物場景測試
    result = await test_runner.run_single_test("historical_figure", test_rounds=2)
    
    print(f"測試完成！總體分數: {result['overall_average_score']:.3f}")
    return result

async def example_comprehensive_test():
    """全面測試範例"""
    print("=== 全面測試範例 ===")
    
    # 建立測試執行器
    test_runner = RoleplayTestRunner()
    
    # 執行所有場景的測試
    result = await test_runner.run_comprehensive_test()
    
    print(f"全面測試完成！總體平均分數: {result['overall_statistics']['overall_average_score']:.3f}")
    return result

async def example_custom_scenario_test():
    """自訂場景測試範例"""
    print("=== 自訂場景測試範例 ===")
    
    # 建立測試執行器
    test_runner = RoleplayTestRunner()
    
    # 自訂場景（可以從外部檔案載入）
    custom_scenario = {
        "name": "自訂角色 - 星際船長",
        "system_prompt": """你現在要扮演一位星際探險船的船長。請以第一人稱方式回應，展現船長的領導能力、冒險精神和對船員的關懷。你的回答應該符合科幻太空背景，包含星際旅行、外星文明探索等元素。

角色背景：
- 身份：星際探險船「探索者號」船長
- 經歷：完成過多次深空探索任務
- 特質：勇敢、果斷、富有同情心
- 使命：探索未知星系，尋找新的生命形式

請保持科幻角色的特質，回答時要展現出太空探險家的視野和責任感。""",
        "conversation_starter": "船長，請分享您最難忘的星際探索經歷？",
        "follow_up_questions": [
            "在面對未知外星文明時，您如何確保船員的安全？",
            "您認為星際探索對人類的未來有什麼意義？",
            "如果有機會重新選擇，您還會成為星際船長嗎？"
        ]
    }
    
    # 由於我們需要修改測試執行器的內部邏輯來支援自訂場景，
    # 這裡示範如何擴展現有功能（實際實現需要修改 test_runner）
    print("自訂場景功能需要擴展現有程式碼來實現")
    print("場景設定:", custom_scenario["name"])

def print_available_scenarios():
    """顯示可用場景"""
    print("=== 可用測試場景 ===")
    scenarios = get_all_scenarios()
    for scenario in scenarios:
        print(f"- {scenario}")

def print_configuration_info():
    """顯示設定資訊"""
    print("=== 當前設定 ===")
    print(f"服務提供者: {config.provider}")
    print(f"模型: {config.current_model}")
    print(f"測試輪數: {config.test_rounds}")
    print(f"最大 tokens: {config.max_tokens}")
    print(f"溫度: {config.temperature}")

async def main():
    """主範例程式"""
    print("LLM 角色扮演評估程式使用範例")
    print("=" * 50)
    
    # 顯示設定資訊
    print_configuration_info()
    print()
    
    # 顯示可用場景
    print_available_scenarios()
    print()
    
    # 執行範例測試
    try:
        # 單一場景測試
        await example_single_scenario_test()
        print()
        
        # 全面測試（註解掉以節省時間，實際使用時可取消註解）
        # await example_comprehensive_test()
        # print()
        
        # 自訂場景測試
        await example_custom_scenario_test()
        
    except Exception as e:
        print(f"範例執行失敗: {e}")
        print("請檢查環境變數設定和服務連線狀態")

if __name__ == "__main__":
    # 執行非同步範例
    asyncio.run(main())