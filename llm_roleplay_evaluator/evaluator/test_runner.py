import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

from config import config
from providers import OllamaClient, OpenRouterClient
from prompts import get_scenario_prompt, get_all_scenarios
from .scoring import RoleplayScorer, calculate_overall_score

class RoleplayTestRunner:
    """角色扮演測試執行器"""
    
    def __init__(self):
        self.scorer = RoleplayScorer()
        self.llm_client = self._create_llm_client()
        self.results_dir = Path("data/results")
        self.results_dir.mkdir(parents=True, exist_ok=True)
    
    def _create_llm_client(self):
        """根據設定建立 LLM 客戶端"""
        if config.provider == "ollama":
            return OllamaClient(
                base_url=config.ollama_base_url,
                model=config.ollama_model,
                max_tokens=config.max_tokens,
                temperature=config.temperature
            )
        elif config.provider == "openrouter":
            if not config.openrouter_api_key:
                raise ValueError("OpenRouter API 金鑰未設定")
            return OpenRouterClient(
                api_key=config.openrouter_api_key,
                model=config.openrouter_model,
                max_tokens=config.max_tokens,
                temperature=config.temperature
            )
        else:
            raise ValueError(f"不支援的服務提供者: {config.provider}")
    
    async def run_single_test(self, scenario_key: str, test_rounds: Optional[int] = None) -> Dict[str, Any]:
        """執行單一場景測試
        
        Args:
            scenario_key: 場景鍵值
            test_rounds: 測試輪數，如未指定則使用設定值
            
        Returns:
            測試結果字典
        """
        if test_rounds is None:
            test_rounds = config.test_rounds
        
        scenario = get_scenario_prompt(scenario_key)
        conversation_history = []
        test_results = []
        
        print(f"開始測試場景: {scenario['name']}")
        print(f"使用模型: {config.current_model}")
        print(f"測試輪數: {test_rounds}")
        print("-" * 50)
        
        # 健康檢查
        if not await self.llm_client.health_check():
            raise RuntimeError(f"{config.provider} 服務不可用")
        
        # 執行多輪對話測試
        for round_num in range(test_rounds):
            print(f"第 {round_num + 1} 輪測試...")
            
            # 決定本輪的問題
            if round_num == 0:
                user_message = scenario["conversation_starter"]
            else:
                user_message = scenario["follow_up_questions"][
                    min(round_num - 1, len(scenario["follow_up_questions"]) - 1)
                ]
            
            # 建立訊息 - 只傳遞使用者與助理的對話歷史，不重複系統提示詞
            messages = self._build_roleplay_messages(
                scenario["system_prompt"],
                user_message,
                conversation_history
            )
            
            # 發送請求並計時
            start_time = time.time()
            try:
                response = await self.llm_client.chat_completion(messages)
                response_time = time.time() - start_time
            except Exception as e:
                print(f"第 {round_num + 1} 輪測試失敗: {str(e)}")
                response = f"錯誤: {str(e)}"
                response_time = 0
            
            # 計算評分
            scores = self._calculate_scores(response, scenario["system_prompt"], conversation_history)
            
            # 記錄本輪結果
            round_result = {
                "round": round_num + 1,
                "user_message": user_message,
                "model_response": response,
                "response_time": response_time,
                "scores": scores,
                "overall_score": calculate_overall_score(scores)
            }
            
            test_results.append(round_result)
            
            # 更新對話歷史
            conversation_history.append({"role": "user", "content": user_message})
            conversation_history.append({"role": "assistant", "content": response})
            
            # 輸出本輪結果
            self._print_round_result(round_result)
        
        # 計算平均分數
        avg_scores = self._calculate_average_scores(test_results)
        
        # 建立最終結果
        final_result = {
            "test_id": f"{scenario_key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "scenario": scenario_key,
            "scenario_name": scenario["name"],
            "model": config.current_model,
            "provider": config.provider,
            "test_rounds": test_rounds,
            "round_results": test_results,
            "average_scores": avg_scores,
            "overall_average_score": calculate_overall_score(avg_scores)
        }
        
        return final_result
    
    def _build_roleplay_messages(self, system_prompt: str, user_message: str, conversation_history: List[Dict] = None) -> List[Dict]:
        """建立角色扮演專用的訊息格式
        
        確保每輪對話都重新包含系統提示詞，但只保留使用者與助理的對話歷史
        """
        # 總是包含系統提示詞
        messages = [{"role": "system", "content": system_prompt}]
        
        # 只加入使用者與助理的對話歷史（排除之前的系統提示詞）
        if conversation_history:
            for msg in conversation_history:
                # 只保留使用者與助理的訊息
                if msg["role"] in ["user", "assistant"]:
                    messages.append(msg)
        
        # 加入當前使用者訊息
        messages.append({"role": "user", "content": user_message})
        return messages

    def _calculate_scores(self, response: str, system_prompt: str, conversation_history: List[Dict]) -> Dict[str, float]:
        """計算各項評分"""
        return {
            "role_consistency": self.scorer.calculate_role_consistency_score(response, system_prompt),
            "fluency": self.scorer.calculate_fluency_score(response),
            "context_coherence": self.scorer.calculate_context_coherence_score(conversation_history, response)
        }
    
    def _calculate_average_scores(self, test_results: List[Dict]) -> Dict[str, float]:
        """計算平均分數"""
        if not test_results:
            return {}
        
        score_keys = test_results[0]["scores"].keys()
        avg_scores = {}
        
        for key in score_keys:
            scores = [result["scores"][key] for result in test_results]
            avg_scores[key] = sum(scores) / len(scores)
        
        return avg_scores
    
    def _print_round_result(self, round_result: Dict):
        """輸出單輪測試結果"""
        print(f"輪次 {round_result['round']}:")
        print(f"  問題: {round_result['user_message']}")
        print(f"  回應: {round_result['model_response'][:100]}...")
        print(f"  回應時間: {round_result['response_time']:.2f}s")
        print(f"  評分: {round_result['overall_score']:.2f}")
        print(f"  詳細分數: {round_result['scores']}")
        print("-" * 30)
    
    async def run_comprehensive_test(self, scenarios: Optional[List[str]] = None) -> Dict[str, Any]:
        """執行全面測試（多個場景）
        
        Args:
            scenarios: 要測試的場景列表，如未指定則測試所有場景
            
        Returns:
            全面測試結果
        """
        if scenarios is None:
            scenarios = get_all_scenarios()
        
        comprehensive_results = {}
        all_scenario_results = []
        
        print("開始全面測試")
        print("=" * 60)
        
        for scenario in scenarios:
            try:
                result = await self.run_single_test(scenario)
                comprehensive_results[scenario] = result
                all_scenario_results.append(result)
                
                # 儲存單一場景結果
                self._save_results(result)
                
            except Exception as e:
                print(f"場景 {scenario} 測試失敗: {str(e)}")
                comprehensive_results[scenario] = {"error": str(e)}
        
        # 計算總體統計
        overall_stats = self._calculate_overall_stats(all_scenario_results)
        
        final_comprehensive_result = {
            "comprehensive_test_id": f"comprehensive_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "model": config.current_model,
            "provider": config.provider,
            "tested_scenarios": scenarios,
            "scenario_results": comprehensive_results,
            "overall_statistics": overall_stats
        }
        
        # 儲存全面測試結果
        self._save_comprehensive_results(final_comprehensive_result)
        
        return final_comprehensive_result
    
    def _calculate_overall_stats(self, all_results: List[Dict]) -> Dict[str, Any]:
        """計算總體統計數據"""
        if not all_results:
            return {}
        
        successful_results = [r for r in all_results if "error" not in r]
        
        if not successful_results:
            return {"error": "所有測試都失敗"}
        
        # 計算各項平均分數
        avg_scores = {}
        score_keys = successful_results[0]["average_scores"].keys()
        
        for key in score_keys:
            scores = [result["average_scores"][key] for result in successful_results]
            avg_scores[key] = sum(scores) / len(scores)
        
        # 計算回應時間統計
        response_times = []
        for result in successful_results:
            for round_result in result["round_results"]:
                response_times.append(round_result["response_time"])
        
        return {
            "average_scores": avg_scores,
            "overall_average_score": calculate_overall_score(avg_scores),
            "response_time_stats": {
                "average": sum(response_times) / len(response_times),
                "min": min(response_times),
                "max": max(response_times)
            },
            "success_rate": len(successful_results) / len(all_results)
        }
    
    def _save_results(self, result: Dict, filename: Optional[str] = None):
        """儲存測試結果到檔案"""
        if filename is None:
            filename = f"{result['test_id']}.json"
        
        file_path = self.results_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"結果已儲存至: {file_path}")
    
    def _save_comprehensive_results(self, result: Dict):
        """儲存全面測試結果"""
        filename = f"{result['comprehensive_test_id']}.json"
        self._save_results(result, filename)