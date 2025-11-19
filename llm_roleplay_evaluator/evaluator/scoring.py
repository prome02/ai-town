import re
from typing import Dict, List, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class RoleplayScorer:
    """角色扮演評分器"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
    
    def calculate_role_consistency_score(self, response: str, system_prompt: str) -> float:
        """計算角色一致性分數
        
        Args:
            response: 模型回應
            system_prompt: 系統提示詞（角色設定）
            
        Returns:
            float: 一致性分數 (0-1)
        """
        # 檢查是否使用第一人稱（角色扮演的重要指標）
        first_person_score = self._check_first_person_usage(response)
        
        # 檢查是否出現AI相關表述（負面指標）
        ai_mention_penalty = self._check_ai_mentions(response)
        
        # 檢查回應是否包含角色相關關鍵詞
        role_keywords = self._extract_role_keywords(system_prompt)
        keyword_score = self._calculate_keyword_score(response, role_keywords)
        
        # 計算語義相似度
        semantic_score = self._calculate_semantic_similarity(response, system_prompt)
        
        # 檢查角色特質表現
        trait_score = self._check_character_traits(response, system_prompt)
        
        # 綜合評分（第一人稱使用最重要）
        consistency_score = (
            0.3 * first_person_score +
            0.25 * semantic_score +
            0.2 * keyword_score +
            0.25 * trait_score -
            ai_mention_penalty
        )
        return max(0, min(consistency_score, 1.0))
    
    def _check_first_person_usage(self, response: str) -> float:
        """檢查第一人稱使用情況"""
        first_person_indicators = ['我', '我的', '我們', '我們的', '本人', '俺', '咱']
        total_words = len(response)
        if total_words == 0:
            return 0.0
        
        first_person_count = sum(response.count(indicator) for indicator in first_person_indicators)
        
        # 適度的第一人稱使用（每50字約1-3次）
        ideal_ratio = 0.02  # 2%的字是第一人稱
        actual_ratio = first_person_count / total_words
        
        # 計算分數（接近理想比例得分越高）
        score = 1.0 - min(abs(actual_ratio - ideal_ratio) / ideal_ratio, 1.0)
        return score
    
    def _check_ai_mentions(self, response: str) -> float:
        """檢查是否出現AI相關表述（懲罰分數）"""
        ai_indicators = [
            '作為AI', '作為人工智能', '作為語言模型', '我是AI', '我是人工智能',
            'OpenAI', 'GPT', '語言模型', '大語言模型', 'LLM'
        ]
        
        penalty = 0
        for indicator in ai_indicators:
            if indicator.lower() in response.lower():
                penalty += 0.3  # 每次出現扣0.3分
        
        return min(penalty, 1.0)  # 最多扣1分
    
    def _check_character_traits(self, response: str, system_prompt: str) -> float:
        """檢查角色特質表現"""
        traits_score = 0.5  # 基礎分
        
        # 從系統提示詞中提取角色特質關鍵詞
        trait_keywords = self._extract_character_traits(system_prompt)
        
        # 檢查回應中是否體現這些特質
        response_lower = response.lower()
        matched_traits = 0
        
        for trait in trait_keywords:
            if trait in response_lower:
                matched_traits += 1
        
        if trait_keywords:
            traits_score += (matched_traits / len(trait_keywords)) * 0.5
        
        return min(traits_score, 1.0)
    
    def _extract_character_traits(self, system_prompt: str) -> list:
        """從系統提示詞中提取角色特質關鍵詞"""
        traits = []
        
        # 常見的性格特質關鍵詞
        common_traits = [
            '樂觀', '開朗', '焦慮', '內向', '自信', '穩重', '創意', '敏感',
            '耐心', '細心', '務實', '理想主義', '熱情', '冷靜', '活潑', '沉穩'
        ]
        
        prompt_lower = system_prompt.lower()
        for trait in common_traits:
            if trait in prompt_lower:
                traits.append(trait)
        
        return traits
    
    def calculate_fluency_score(self, response: str) -> float:
        """計算流暢度分數"""
        # 檢查句子結構完整性
        sentence_score = self._check_sentence_structure(response)
        
        # 檢查回應長度適中性
        length_score = self._check_response_length(response)
        
        # 檢查語法錯誤（簡單版本）
        grammar_score = self._check_grammar_errors(response)
        
        return 0.4 * sentence_score + 0.3 * length_score + 0.3 * grammar_score
    
    def calculate_context_coherence_score(self, conversation_history: List[Dict], current_response: str) -> float:
        """計算上下文連貫性分數"""
        if len(conversation_history) < 2:
            return 0.8  # 對話剛開始，給予基礎分
        
        # 檢查是否回應了上一個問題
        last_user_message = conversation_history[-1]["content"] if conversation_history[-1]["role"] == "user" else ""
        response_similarity = self._calculate_semantic_similarity(current_response, last_user_message)
        
        # 檢查是否保持了對話主題
        topic_consistency = self._check_topic_consistency(conversation_history, current_response)
        
        return 0.6 * response_similarity + 0.4 * topic_consistency
    
    def _extract_role_keywords(self, system_prompt: str) -> List[str]:
        """從系統提示詞中提取角色關鍵詞"""
        # 簡單的關鍵詞提取
        keywords = re.findall(r'\b\w+\b', system_prompt.lower())
        # 過濾常見詞和保留角色相關詞
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}
        role_words = [word for word in keywords if word not in common_words and len(word) > 3]
        return list(set(role_words))
    
    def _calculate_keyword_score(self, response: str, keywords: List[str]) -> float:
        """計算關鍵詞匹配分數"""
        if not keywords:
            return 0.5
        
        response_lower = response.lower()
        matches = sum(1 for keyword in keywords if keyword in response_lower)
        return matches / len(keywords)
    
    def _calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """計算兩個文本的語義相似度"""
        if not text1 or not text2:
            return 0.0
        
        try:
            # 使用 TF-IDF 向量化
            vectors = self.vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
            return similarity
        except:
            return 0.5  # 如果計算失敗，返回中等分數
    
    def _check_sentence_structure(self, response: str) -> float:
        """檢查句子結構完整性"""
        sentences = re.split(r'[.!?]+', response)
        valid_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if not valid_sentences:
            return 0.3
        
        # 檢查句子長度變化
        sentence_lengths = [len(s) for s in valid_sentences]
        length_variation = np.std(sentence_lengths) / np.mean(sentence_lengths) if sentence_lengths else 0
        
        # 長度變化適中表示更好的結構
        structure_score = 1.0 - min(abs(length_variation - 0.3), 0.5)
        return structure_score
    
    def _check_response_length(self, response: str) -> float:
        """檢查回應長度適中性"""
        word_count = len(response.split())
        
        # 理想長度範圍：50-300字
        if 50 <= word_count <= 300:
            return 1.0
        elif word_count < 20:
            return 0.3
        elif word_count > 500:
            return 0.6
        else:
            # 線性插值
            if word_count < 50:
                return 0.3 + (word_count / 50) * 0.7
            else:
                return 0.6 + ((300 - word_count) / 200) * 0.4
    
    def _check_grammar_errors(self, response: str) -> float:
        """簡單的語法錯誤檢查"""
        # 檢查常見語法錯誤模式
        errors = 0
        
        # 檢查連續大寫字母（可能表示未轉換大小寫）
        if re.search(r'[A-Z]{3,}', response):
            errors += 1
        
        # 檢查連續標點符號
        if re.search(r'[.!?]{2,}', response):
            errors += 1
        
        # 檢查未閉合的括號
        if response.count('(') != response.count(')'):
            errors += 1
        
        # 根據錯誤數量計算分數
        return max(0, 1.0 - errors * 0.2)
    
    def _check_topic_consistency(self, conversation_history: List[Dict], current_response: str) -> float:
        """檢查主題一致性"""
        if len(conversation_history) < 3:
            return 0.8
        
        # 提取對話主題關鍵詞
        all_messages = " ".join([msg["content"] for msg in conversation_history[-3:]])
        current_topic_similarity = self._calculate_semantic_similarity(all_messages, current_response)
        
        return current_topic_similarity

def calculate_overall_score(scores: Dict[str, float]) -> float:
    """計算總體評分"""
    weights = {
        'role_consistency': 0.4,
        'fluency': 0.3,
        'context_coherence': 0.3
    }
    
    overall_score = 0
    for key, weight in weights.items():
        overall_score += scores.get(key, 0) * weight
    
    return overall_score