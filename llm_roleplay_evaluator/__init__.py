# LLM 角色扮演評估程式套件
__version__ = "1.0.0"
__author__ = "LLM Roleplay Evaluator Team"
__description__ = "大型語言模型角色扮演能力評估工具"

from .config import config
from .evaluator import RoleplayTestRunner, RoleplayScorer
from .prompts import get_scenario_prompt, get_all_scenarios

__all__ = [
    'config',
    'RoleplayTestRunner',
    'RoleplayScorer',
    'get_scenario_prompt',
    'get_all_scenarios'
]