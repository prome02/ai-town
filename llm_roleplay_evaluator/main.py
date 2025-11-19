#!/usr/bin/env python3
"""
LLM 角色扮演能力評估程式主程式
支援 Ollama 和 OpenRouter 兩種服務提供者
"""

import asyncio
import argparse
import sys
from pathlib import Path

# 添加專案路徑到 Python 路徑
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from config import config
from evaluator import RoleplayTestRunner
from prompts import get_all_scenarios, get_scenario_prompt

async def main():
    """主程式入口點"""
    parser = argparse.ArgumentParser(description="LLM 角色扮演能力評估程式")
    parser.add_argument(
        "--scenario",
        choices=get_all_scenarios(),
        help="指定測試場景（如未指定則測試所有場景）"
    )
    parser.add_argument(
        "--rounds",
        type=int,
        default=config.test_rounds,
        help=f"測試輪數（預設: {config.test_rounds}）"
    )
    parser.add_argument(
        "--comprehensive",
        action="store_true",
        help="執行全面測試（所有場景）"
    )
    parser.add_argument(
        "--list-scenarios",
        action="store_true",
        help="列出所有可用的測試場景"
    )
    
    args = parser.parse_args()
    
    # 列出可用場景
    if args.list_scenarios:
        print("可用的測試場景:")
        for scenario_key in get_all_scenarios():
            scenario = get_scenario_prompt(scenario_key)
            print(f"  {scenario_key}: {scenario['name']}")
        return
    
    # 建立測試執行器
    try:
        test_runner = RoleplayTestRunner()
    except Exception as e:
        print(f"初始化測試執行器失敗: {e}")
        return
    
    # 執行測試
    try:
        if args.comprehensive or args.scenario is None:
            # 全面測試
            print("執行全面測試...")
            result = await test_runner.run_comprehensive_test()
            print_comprehensive_results(result)
        else:
            # 單一場景測試
            result = await test_runner.run_single_test(args.scenario, args.rounds)
            print_single_scenario_results(result)
            
    except Exception as e:
        print(f"測試執行失敗: {e}")
        return

def print_single_scenario_results(result: dict):
    """輸出單一場景測試結果"""
    print("\n" + "="*60)
    print("測試結果摘要")
    print("="*60)
    print(f"測試 ID: {result['test_id']}")
    print(f"場景: {result['scenario_name']} ({result['scenario']})")
    print(f"模型: {result['model']}")
    print(f"服務提供者: {result['provider']}")
    print(f"測試時間: {result['timestamp']}")
    print(f"測試輪數: {result['test_rounds']}")
    
    print("\n平均分數:")
    for score_name, score_value in result['average_scores'].items():
        print(f"  {score_name.replace('_', ' ').title()}: {score_value:.3f}")
    
    print(f"總體平均分數: {result['overall_average_score']:.3f}")
    
    print("\n各輪詳細結果:")
    for round_result in result['round_results']:
        print(f"輪次 {round_result['round']}:")
        print(f"  問題: {round_result['user_message']}")
        print(f"  回應時間: {round_result['response_time']:.2f}s")
        print(f"  總體分數: {round_result['overall_score']:.3f}")
        print(f"  詳細分數: { {k: f'{v:.3f}' for k, v in round_result['scores'].items()} }")
        print()

def print_comprehensive_results(result: dict):
    """輸出全面測試結果"""
    print("\n" + "="*80)
    print("全面測試結果摘要")
    print("="*80)
    print(f"測試 ID: {result['comprehensive_test_id']}")
    print(f"模型: {result['model']}")
    print(f"服務提供者: {result['provider']}")
    print(f"測試時間: {result['timestamp']}")
    print(f"測試場景數: {len(result['tested_scenarios'])}")
    
    stats = result['overall_statistics']
    if 'error' in stats:
        print(f"錯誤: {stats['error']}")
        return
    
    print("\n總體統計:")
    print(f"成功率: {stats['success_rate']:.1%}")
    print(f"總體平均分數: {stats['overall_average_score']:.3f}")
    
    print("\n各項平均分數:")
    for score_name, score_value in stats['average_scores'].items():
        print(f"  {score_name.replace('_', ' ').title()}: {score_value:.3f}")
    
    print("\n回應時間統計:")
    rt_stats = stats['response_time_stats']
    print(f"  平均: {rt_stats['average']:.2f}s")
    print(f"  最小: {rt_stats['min']:.2f}s")
    print(f"  最大: {rt_stats['max']:.2f}s")
    
    print("\n各場景表現:")
    for scenario_key in result['tested_scenarios']:
        scenario_result = result['scenario_results'][scenario_key]
        if 'error' in scenario_result:
            print(f"  {scenario_key}: 失敗 - {scenario_result['error']}")
        else:
            score = scenario_result['overall_average_score']
            print(f"  {scenario_key}: {score:.3f}")

def print_configuration():
    """輸出當前設定"""
    print("當前設定:")
    print(f"  服務提供者: {config.provider}")
    print(f"  模型: {config.current_model}")
    print(f"  最大 tokens: {config.max_tokens}")
    print(f"  溫度: {config.temperature}")
    print(f"  測試輪數: {config.test_rounds}")
    
    if config.provider == "ollama":
        print(f"  Ollama URL: {config.ollama_base_url}")
    elif config.provider == "openrouter":
        print(f"  OpenRouter API 金鑰: {'已設定' if config.openrouter_api_key else '未設定'}")

if __name__ == "__main__":
    print("LLM 角色扮演能力評估程式")
    print_configuration()
    print("-" * 40)
    
    # 執行非同步主程式
    asyncio.run(main())