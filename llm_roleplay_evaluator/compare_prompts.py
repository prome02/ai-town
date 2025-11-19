"""比較舊版和新版提示詞的角色扮演效果 - 帶完整日誌記錄"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List
from pathlib import Path
from config.settings import config

# 修正 Windows 控制台編碼問題
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
from providers.ollama_client import OllamaClient
from providers.openrouter_client import OpenRouterClient
from prompts.roleplay_prompts import ROLEPLAY_SCENARIOS as OLD_SCENARIOS
from prompts.roleplay_prompts_v2 import ROLEPLAY_SCENARIOS as NEW_SCENARIOS

# 日誌目錄設定
LOG_DIR = Path("data/logs")
RESULTS_DIR = Path("data/results")
LOG_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

class TestLogger:
    """測試日誌記錄器"""

    def __init__(self, model_name: str, test_type: str):
        self.model_name = model_name.replace(':', '_').replace('/', '_')
        self.test_type = test_type
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_id = f"{self.model_name}_{test_type}_{self.timestamp}"

        # 創建本次測試的日誌檔
        self.log_file = LOG_DIR / f"{self.session_id}.log"
        self.json_file = RESULTS_DIR / f"{self.session_id}.json"

        self.test_results = {
            "session_id": self.session_id,
            "model_name": model_name,
            "test_type": test_type,
            "start_time": datetime.now().isoformat(),
            "tests": []
        }

        self.log(f"=== Test Session Started ===")
        self.log(f"Model: {model_name}")
        self.log(f"Type: {test_type}")
        self.log(f"Time: {self.timestamp}")
        self.log("="*80)

    def log(self, message: str):
        """寫入日誌檔"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] {message}\n"
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_line)
        print(message)  # 同時輸出到控制台

    def add_test_result(self, result: dict):
        """添加單個測試結果"""
        result["timestamp"] = datetime.now().isoformat()
        self.test_results["tests"].append(result)

        # 即時寫入 JSON (以防程式中斷)
        self._save_json()

    def _save_json(self):
        """儲存 JSON 結果"""
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)

    def finalize(self):
        """完成測試,寫入總結"""
        self.test_results["end_time"] = datetime.now().isoformat()
        self.test_results["total_tests"] = len(self.test_results["tests"])

        # 計算統計
        scores = [t["evaluation"]["score"] for t in self.test_results["tests"]
                  if "evaluation" in t and "error" not in t]

        if scores:
            self.test_results["statistics"] = {
                "average_score": sum(scores) / len(scores),
                "max_score": max(scores),
                "min_score": min(scores),
                "successful_tests": len(scores),
                "failed_tests": len(self.test_results["tests"]) - len(scores)
            }

        self._save_json()

        self.log("\n" + "="*80)
        self.log("=== Test Session Completed ===")
        if "statistics" in self.test_results:
            stats = self.test_results["statistics"]
            self.log(f"Total Tests: {self.test_results['total_tests']}")
            self.log(f"Successful: {stats['successful_tests']}")
            self.log(f"Failed: {stats['failed_tests']}")
            self.log(f"Average Score: {stats['average_score']:.1f}/100")
            self.log(f"Score Range: {stats['min_score']} - {stats['max_score']}")
        self.log(f"\nResults saved to:")
        self.log(f"  Log: {self.log_file}")
        self.log(f"  JSON: {self.json_file}")
        self.log("="*80)


async def test_prompt_version(client, scenario_data: dict, version: str, logger: TestLogger) -> dict:
    """測試單一提示詞版本"""
    logger.log(f"\n{'='*60}")
    logger.log(f"Testing {version} - {scenario_data['name']}")
    logger.log('='*60)

    # 構建對話
    messages = [
        {"role": "system", "content": scenario_data["system_prompt"]},
        {"role": "user", "content": scenario_data["conversation_starter"]}
    ]

    logger.log("\n--- System Prompt (first 200 chars) ---")
    logger.log(scenario_data["system_prompt"][:200] + "...")
    logger.log("\n--- User Message ---")
    logger.log(scenario_data["conversation_starter"])

    try:
        start_time = datetime.now()
        response = await client.chat_completion(messages=messages)
        response_time = (datetime.now() - start_time).total_seconds()

        logger.log(f"\n--- Response (took {response_time:.2f}s) ---")
        logger.log(response)
        logger.log("-" * 60)

        # 評估回應
        evaluation = evaluate_response(response, scenario_data["name"])

        logger.log(f"\n--- Evaluation ---")
        logger.log(f"Score: {evaluation['score']}/100")
        logger.log(f"  No AI markers: {not evaluation['has_ai_markers']}")
        logger.log(f"  First person: {evaluation['uses_first_person']}")
        logger.log(f"  Has personality: {evaluation['has_personality']}")
        logger.log(f"  Word count: {evaluation['word_count']}")

        result = {
            "version": version,
            "scenario": scenario_data["name"],
            "response": response,
            "response_time_seconds": response_time,
            "evaluation": evaluation,
            "system_prompt_length": len(scenario_data["system_prompt"]),
            "user_message": scenario_data["conversation_starter"]
        }

        return result

    except Exception as e:
        logger.log(f"\n[ERROR] {e}")
        return {
            "version": version,
            "scenario": scenario_data["name"],
            "error": str(e)
        }


def evaluate_response(response: str, character_name: str) -> dict:
    """評估回應品質"""
    response_lower = response.lower()

    # 檢查 AI 自我指涉
    ai_markers = [
        "as an ai", "as a language model", "i'm an ai",
        "i am an ai", "i cannot", "i don't have personal",
        "作為ai", "作為語言模型", "我是ai", "我是一個ai"
    ]
    has_ai_markers = any(marker in response_lower for marker in ai_markers)

    # 檢查第一人稱使用
    uses_first_person = " i " in response_lower or response_lower.startswith("i ")

    # 檢查個性標記
    personality_markers = ["*", "...", "!", "oh", "wow", "haha", "hmm", "ah", "um"]
    has_personality_markers = any(marker in response_lower for marker in personality_markers)

    # 長度檢查
    word_count = len(response.split())
    appropriate_length = 30 < word_count < 200

    # 評分
    score = 0
    reasons = []

    if not has_ai_markers:
        score += 40
        reasons.append("+40: No AI self-reference")
    else:
        reasons.append(" 0: Contains AI markers")

    if uses_first_person:
        score += 20
        reasons.append("+20: Uses first person")
    else:
        reasons.append(" 0: No first person")

    if has_personality_markers:
        score += 20
        reasons.append("+20: Has personality markers")
    else:
        reasons.append(" 0: No personality markers")

    if appropriate_length:
        score += 20
        reasons.append("+20: Appropriate length")
    else:
        reasons.append(f" 0: Length issue ({word_count} words)")

    return {
        "score": score,
        "has_ai_markers": has_ai_markers,
        "uses_first_person": uses_first_person,
        "has_personality": has_personality_markers,
        "word_count": word_count,
        "appropriate_length": appropriate_length,
        "scoring_breakdown": reasons
    }


async def compare_prompts(model_name: str):
    """比較新舊提示詞版本"""
    logger = TestLogger(model_name, "prompt_comparison")

    # 初始化客戶端
    if config.provider == "ollama":
        client = OllamaClient(config.ollama_base_url, model_name)
    else:
        client = OpenRouterClient(config.openrouter_api_key, model_name)

    # 健康檢查
    logger.log("Performing health check...")
    if not await client.health_check():
        logger.log("[FAILED] Client health check failed!")
        logger.finalize()
        return

    logger.log("[OK] Client health check passed\n")

    # 測試場景對應
    test_pairs = [
        ("optimistic_elderly", "lucky_space_enthusiast"),
        # 可以添加更多對應關係
    ]

    for old_key, new_key in test_pairs:
        # 測試舊版
        if old_key in OLD_SCENARIOS:
            logger.log("\n\n" + ">"*80)
            logger.log("TESTING OLD VERSION (Chinese, verbose)")
            logger.log(">"*80)
            old_result = await test_prompt_version(
                client,
                OLD_SCENARIOS[old_key],
                f"OLD - {OLD_SCENARIOS[old_key]['name']}",
                logger
            )
            logger.add_test_result(old_result)
            await asyncio.sleep(2)

        # 測試新版
        if new_key in NEW_SCENARIOS:
            logger.log("\n\n" + ">"*80)
            logger.log("TESTING NEW VERSION (English, concise)")
            logger.log(">"*80)
            new_result = await test_prompt_version(
                client,
                NEW_SCENARIOS[new_key],
                f"NEW - {NEW_SCENARIOS[new_key]['name']}",
                logger
            )
            logger.add_test_result(new_result)
            await asyncio.sleep(2)

    logger.finalize()


async def test_all_new_scenarios(model_name: str):
    """測試所有新版場景"""
    logger = TestLogger(model_name, "all_new_scenarios")

    # 初始化客戶端
    if config.provider == "ollama":
        client = OllamaClient(config.ollama_base_url, model_name)
    else:
        client = OpenRouterClient(config.openrouter_api_key, model_name)

    logger.log("Performing health check...")
    if not await client.health_check():
        logger.log("[FAILED] Client health check failed!")
        logger.finalize()
        return

    logger.log("[OK] Client health check passed\n")

    # 測試所有場景
    for scenario_key, scenario_data in NEW_SCENARIOS.items():
        logger.log("\n\n" + ">"*80)
        logger.log(f"TESTING SCENARIO: {scenario_key}")
        logger.log(">"*80)

        result = await test_prompt_version(
            client,
            scenario_data,
            f"NEW - {scenario_data['name']}",
            logger
        )
        logger.add_test_result(result)
        await asyncio.sleep(2)

    logger.finalize()


def view_historical_logs(model_name: str = None, limit: int = 10):
    """查看歷史測試日誌"""
    print("\n" + "="*80)
    print("Historical Test Logs")
    print("="*80)

    json_files = sorted(RESULTS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True)

    if model_name:
        model_safe = model_name.replace(':', '_').replace('/', '_')
        json_files = [f for f in json_files if model_safe in f.name]

    json_files = json_files[:limit]

    if not json_files:
        print("No historical logs found.")
        return

    for idx, json_file in enumerate(json_files, 1):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"\n{idx}. {json_file.name}")
        print(f"   Model: {data['model_name']}")
        print(f"   Time: {data['start_time']}")
        print(f"   Tests: {data['total_tests']}")

        if "statistics" in data:
            stats = data["statistics"]
            print(f"   Avg Score: {stats['average_score']:.1f}/100")
            print(f"   Range: {stats['min_score']}-{stats['max_score']}")
            print(f"   Success Rate: {stats['successful_tests']}/{data['total_tests']}")


if __name__ == "__main__":
    import sys

    # 使用方式:
    # python compare_prompts.py compare [model_name]   - 比較新舊提示詞
    # python compare_prompts.py all [model_name]        - 測試所有新場景
    # python compare_prompts.py history [model_name]    - 查看歷史記錄

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python compare_prompts.py compare [model_name]")
        print("  python compare_prompts.py all [model_name]")
        print("  python compare_prompts.py history [model_name]")
        sys.exit(1)

    mode = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "gpt-oss:20b-cloud"

    if mode == "history":
        view_historical_logs(model if len(sys.argv) > 2 else None)
    elif mode == "all":
        asyncio.run(test_all_new_scenarios(model))
    elif mode == "compare":
        asyncio.run(compare_prompts(model))
    else:
        print(f"Unknown mode: {mode}")
        print("Valid modes: compare, all, history")
