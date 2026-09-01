"""
llm_client.py - Centralized LLM Gateway for SkillForge.

Integrates NVIDIA's OpenAI-compatible API hosting DeepSeek v4 Flash
(model: `deepseek-ai/deepseek-v4-flash-0731`) as the primary inference engine
across SkillForge AI/ML subsystems:
  - Assessment Generation & Grading (assessment_model.py)
  - Learning Plan Synthesis (learning_plan_model.py)
  - 1:1 Socratic AI Tutoring with RAG Context (tutoring_model.py)
  - Verified Document Synthesis - Resume & LOR (document_generation_model.py)
"""

import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

# Ensure UTF-8 console output on Windows
for _stream in (sys.stdout, sys.stderr):
    _reconfig = getattr(_stream, "reconfigure", None)
    if callable(_reconfig):
        try:
            _reconfig(encoding="utf-8")
        except Exception:
            pass

# Default Configurations for Multi-Provider Endpoints
DEFAULT_GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
DEFAULT_GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
DEFAULT_NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
DEFAULT_NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
DEFAULT_NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")

def resolve_provider_config(custom_key: Optional[str] = None) -> Tuple[str, str, str]:
    """
    Auto-detects provider, base URL, and effective model based on key format or environment variables.
    Returns: (effective_api_key, effective_base_url, effective_model)
    """
    key = ""
    if custom_key and custom_key.strip():
        cleaned = custom_key.strip()
        if cleaned.lower() not in ("string", "null", "none", "your-api-key", "sk-...", ""):
            key = cleaned

    if not key:
        key = (
            os.environ.get("GROQ_API_KEY")
            or DEFAULT_GROQ_API_KEY
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
            or os.environ.get("OPENROUTER_API_KEY")
            or os.environ.get("NVIDIA_API_KEY")
            or DEFAULT_NVIDIA_API_KEY
        )

    # Auto-detect endpoint and model based on API Key prefix
    if key.startswith("gsk_"):
        # Groq endpoint (High speed)
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        model = os.environ.get("GROQ_MODEL") or os.environ.get("LLM_MODEL") or DEFAULT_GROQ_MODEL
    elif key.startswith("AIzaSy"):
        # Google Gemini via OpenAI-compatible endpoint
        base_url = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
        model = os.environ.get("GEMINI_MODEL") or os.environ.get("LLM_MODEL") or "gemini-2.0-flash"
    elif key.startswith("sk-or-"):
        # OpenRouter endpoint
        base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        model = os.environ.get("OPENROUTER_MODEL") or os.environ.get("LLM_MODEL") or "meta-llama/llama-3.3-70b-instruct"
    elif key.startswith("sk-proj-") or (key.startswith("sk-") and not key.startswith("sk-or-")):
        # OpenAI official endpoint
        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.environ.get("OPENAI_MODEL") or os.environ.get("LLM_MODEL") or "gpt-4o-mini"
    else:
        # Default / NVIDIA endpoint
        base_url = os.environ.get("NVIDIA_BASE_URL") or DEFAULT_NVIDIA_BASE_URL
        model = os.environ.get("NVIDIA_MODEL") or os.environ.get("LLM_MODEL") or DEFAULT_NVIDIA_MODEL

    return key, base_url, model


def get_effective_api_key(custom_key: Optional[str] = None) -> str:
    key, _, _ = resolve_provider_config(custom_key)
    return key


def get_effective_base_url(custom_key: Optional[str] = None) -> str:
    _, base_url, _ = resolve_provider_config(custom_key)
    return base_url


def get_effective_model(custom_key: Optional[str] = None) -> str:
    _, _, model = resolve_provider_config(custom_key)
    return model


def get_effective_timeout(custom_timeout: Optional[float] = None) -> float:
    """Returns timeout from argument or LLM_TIMEOUT env var (default: 25.0s for high quality generation)."""
    if custom_timeout is not None:
        return custom_timeout
    try:
        return float(os.environ.get("LLM_TIMEOUT", "25.0"))
    except Exception:
        return 25.0


def get_openai_client(api_key: Optional[str] = None, timeout: Optional[float] = None):
    """
    Initializes an OpenAI client configured for the detected provider endpoint.
    """
    effective_key, base_url, _ = resolve_provider_config(api_key)
    effective_timeout = get_effective_timeout(timeout)
    
    try:
        from openai import OpenAI
        return OpenAI(api_key=effective_key, base_url=base_url, timeout=effective_timeout)
    except Exception as e:
        print(f"  [Warning] Failed to instantiate OpenAI client: {e}", file=sys.stderr)
        return None


def strip_json_markdown(raw_text: str) -> str:
    """Strips markdown code fences (```json ... ```) and extracts outermost JSON structure."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    first_bracket = text.find("[")
    last_bracket = text.rfind("]")

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        if last_brace != -1 and last_brace > first_brace:
            return text[first_brace : last_brace + 1].strip()
    elif first_bracket != -1:
        if last_bracket != -1 and last_bracket > first_bracket:
            return text[first_bracket : last_bracket + 1].strip()
    return text.strip()


def call_llm(
    prompt: Optional[str] = None,
    messages: Optional[List[Dict[str, str]]] = None,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    timeout: Optional[float] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Invokes the LLM (DeepSeek v4 Flash on NVIDIA API) and returns (content, reasoning).

    Args:
        prompt: Optional single user prompt string.
        messages: Optional list of message dicts [{"role": "user"|"assistant"|"system", "content": "..."}].
        system_prompt: Optional system prompt to prepend.
        temperature: Sampling temperature.
        max_tokens: Maximum tokens in response.
        api_key: Optional custom API key.
        model: Optional custom model name.
        timeout: Request timeout in seconds.

    Returns:
        Tuple[Optional[str], Optional[str]]: (response_text, reasoning_text)
    """
    client = get_openai_client(api_key=api_key, timeout=timeout)
    if not client:
        return None, None

    model_name = model or get_effective_model()
    
    formatted_messages: List[Dict[str, str]] = []
    if system_prompt and system_prompt.strip():
        formatted_messages.append({"role": "system", "content": system_prompt.strip()})
        
    if messages:
        formatted_messages.extend(messages)
    elif prompt:
        formatted_messages.append({"role": "user", "content": prompt})
    else:
        return None, None

    models_to_try = [model_name]
    # Add fallback models if on Groq
    if model_name == "openai/gpt-oss-120b":
        models_to_try.extend(["qwen/qwen3.8-27b", "openai/gpt-oss-20b"])
    elif model_name == "qwen/qwen3.8-27b":
        models_to_try.extend(["openai/gpt-oss-120b", "openai/gpt-oss-20b"])

    last_error = None
    for attempt_model in models_to_try:
        try:
            completion: Any = client.chat.completions.create(
                model=attempt_model,
                messages=formatted_messages,  # type: ignore
                temperature=temperature,
                top_p=0.95,
                max_tokens=max_tokens,
            )
            
            choices = getattr(completion, "choices", None) or (completion.choices if hasattr(completion, "choices") else None)
            if not choices:
                continue
                
            choice = choices[0]
            message = getattr(choice, "message", None)
            if not message:
                continue
                
            content = getattr(message, "content", "") or ""
            reasoning = getattr(message, "reasoning", None) or getattr(message, "reasoning_content", None)
            return content, reasoning
        except Exception as e:
            last_error = e
            if len(models_to_try) > 1 and attempt_model != models_to_try[-1]:
                print(f"  [Notice] Model {attempt_model} hit error ({e}), retrying with fallback model...", file=sys.stderr)
                continue

    if last_error:
        print(f"  [Notice] LLM invocation failed ({last_error}); checking fallback.", file=sys.stderr)
    return None, None
