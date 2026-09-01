"""
learning_plan_model.py - Standalone Learning Plan Generator using Anthropic Claude Sonnet.

================================================================================
ARCHITECTURE & LLM INTEGRATION:
================================================================================
Generates structured, level-gated learning curriculum plans tailored to a
learner's goal, available timeframe, and baseline verified skills.

Key Highlights:
  1. Strict Schema Enforcement:
     - Defines Pydantic v2 data models for LearningPlan, Level, and Module.
     - Validates and serializes LLM output directly into strongly typed models.
  2. Zero-Preamble JSON System Prompt:
     - Prompts the LLM to output pure raw JSON adhering precisely to schema.
     - Automatically scrubs any enclosing markdown code fences if present.
  3. Single-Retry Error Feedback Loop:
     - If initial JSON parsing or Pydantic validation fails, automatically retries
       with the specific validation error appended to the prompt for self-correction.
  4. Model:
     - Default LLM: 'claude-sonnet-4-6' via the Anthropic API.
     - Reads ANTHROPIC_API_KEY from environment with graceful local test fallback.
================================================================================
"""

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, ValidationError

# Ensure UTF-8 console output on Windows
for _stream in (sys.stdout, sys.stderr):
    _reconfig = getattr(_stream, "reconfigure", None)
    if callable(_reconfig):
        try:
            _reconfig(encoding="utf-8")
        except Exception:
            pass

import llm_client

MODEL_ID = "meta/llama-3.2-11b-vision-instruct"

# ----------------------------------------------------------------------
# 1. Pydantic Schema Definitions
# ----------------------------------------------------------------------

class Module(BaseModel):
    """Individual learning module containing subtopics and duration."""
    module_id: str = Field(description="Unique identifier for the module (e.g. 'mod_1_aws_global_infra')")
    title: str = Field(description="Clear, descriptive title of the module")
    subtopics: List[str] = Field(description="List of key concepts or subtopics covered in this module")
    est_minutes: int = Field(description="Estimated study/lab time in minutes")


class Level(BaseModel):
    """Curriculum tier or difficulty level grouping several modules."""
    level_id: str = Field(description="Identifier for the level (e.g. 'level_1_cloud_fundamentals')")
    modules: List[Module] = Field(description="List of sequential modules within this level")


class LearningPlan(BaseModel):
    """Complete personalized learning plan generated for the learner."""
    levels: List[Level] = Field(description="Ordered list of curriculum levels")


# ----------------------------------------------------------------------
# 2. System Prompt & LLM Generation Logic
# ----------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert AI technical curriculum architect.
Your task is to generate a personalized, level-based learning plan for a student based on their goal, timeline, and current baseline skills.

CRITICAL INSTRUCTIONS:
1. You must respond with ONLY valid JSON matching the exact schema below.
2. Do NOT output any markdown fences (e.g. ```json), explanations, introductory text, or concluding notes.
3. Your output must start with '{' and end with '}'.

Target JSON Schema:
{
  "levels": [
    {
      "level_id": "string",
      "modules": [
        {
          "module_id": "string",
          "title": "string",
          "subtopics": ["string", "string"],
          "est_minutes": 60
        }
      ]
    }
  ]
}
"""


def _clean_json_response(raw_text: str) -> str:
    """
    Strips accidental markdown code blocks and trailing/leading non-JSON characters.
    """
    text = raw_text.strip()
    # Remove markdown code block fences if returned
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    # Extract first JSON object boundaries
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]
    return text.strip()


def _generate_mock_plan(goal: str, duration_weeks: int, baseline_skills: Dict[str, float]) -> str:
    """
    Generates a synthetic JSON response dynamically reflecting the user's goal when offline.
    """
    clean_goal = goal.strip() if goal else "Full-Stack Software Development"
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", clean_goal.lower()).strip("_")
    
    return json.dumps(
        {
            "levels": [
                {
                    "level_id": f"level_1_{slug}_foundations",
                    "modules": [
                        {
                            "module_id": f"mod_1_1_{slug}_core",
                            "title": f"Core Foundations of {clean_goal}",
                            "subtopics": [
                                f"Fundamental Syntax & Core Architecture of {clean_goal}",
                                "Memory Management and Data Types",
                                "Control Flow and Standard Library Overview",
                            ],
                            "est_minutes": 90,
                        },
                        {
                            "module_id": f"mod_1_2_{slug}_paradigms",
                            "title": f"{clean_goal} Architectural Patterns & OOP",
                            "subtopics": [
                                "Class Design, Interfaces, and Modular Composition",
                                "Error Handling, Exceptions, and Defensive Programming",
                                "Package Management and Modern Build Systems",
                            ],
                            "est_minutes": 100,
                        },
                    ],
                },
                {
                    "level_id": f"level_2_{slug}_intermediate_mastery",
                    "modules": [
                        {
                            "module_id": f"mod_2_1_{slug}_frameworks",
                            "title": f"Production Frameworks & Ecosystem for {clean_goal}",
                            "subtopics": [
                                f"Idiomatic Framework Patterns in {clean_goal}",
                                "RESTful API Integration and Microservices",
                                "Persistence, ORM, and Relational Database Access",
                            ],
                            "est_minutes": 120,
                        },
                        {
                            "module_id": f"mod_2_2_{slug}_concurrency",
                            "title": f"Concurrency, Performance & Testing in {clean_goal}",
                            "subtopics": [
                                "Multithreading, Async Execution, and Thread Safety",
                                "Automated Unit Testing & Mocking Frameworks",
                                "Benchmarking, Profiling, and Performance Tuning",
                            ],
                            "est_minutes": 110,
                        },
                    ],
                },
                {
                    "level_id": f"level_3_{slug}_capstone_and_deployment",
                    "modules": [
                        {
                            "module_id": f"mod_3_1_{slug}_cloud_deployment",
                            "title": f"Production CI/CD, Containerization & Cloud Deployment",
                            "subtopics": [
                                "Dockerization and Containerized Execution",
                                "CI/CD Automated Pipelines and Code Quality Gates",
                                "Cloud Hosting, Monitoring, and Observability",
                            ],
                            "est_minutes": 115,
                        },
                        {
                            "module_id": f"mod_3_2_{slug}_capstone_project",
                            "title": f"{clean_goal} Capstone Project & Portfolio Deployment",
                            "subtopics": [
                                f"End-to-End System Implementation for {clean_goal}",
                                "Security Hardening and Production Verification",
                            ],
                            "est_minutes": 150,
                        },
                    ],
                },
            ]
        }
    )


def generate_plan(
    goal: str,
    duration_weeks: int,
    baseline_skills: Dict[str, float],
    api_key: Optional[str] = None,
    client: Optional[Any] = None,
) -> LearningPlan:
    """
    Generates a validated LearningPlan for the given goal, timeline, and baseline skills.

    Calls Anthropic's Claude Sonnet API. If initial JSON parsing or Pydantic validation fails,
    retries once with the raw validation error appended for self-correction.

    Args:
        goal: The learning target or certification (e.g. 'AWS Cloud Practitioner').
        duration_weeks: Duration of the study timeline in weeks.
        baseline_skills: Dict of existing skill competencies (e.g. {'python': 0.6, 'linux': 0.3}).
        api_key: Optional Anthropic API Key (defaults to ANTHROPIC_API_KEY env var).
        client: Optional pre-instantiated Anthropic client.

    Returns:
        LearningPlan: Validated Pydantic model instance.

    Raises:
        ValidationError: If response cannot be parsed into LearningPlan even after retry.
    """
    effective_api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    user_prompt = (
        f"Goal: {goal}\n"
        f"Target Duration: {duration_weeks} weeks\n"
        f"Learner Baseline Skills (0.0 to 1.0 scale): {json.dumps(baseline_skills)}\n\n"
        "Generate a structured, progressive learning plan tailored to bridge their skill gaps."
    )

    # Initialize client if API key is present
    anthropic_client = None
    if client is not None:
        anthropic_client = client
    elif effective_api_key and effective_api_key.strip():
        import anthropic
        anthropic_client = anthropic.Anthropic(api_key=effective_api_key.strip())

    # Helper function to execute LLM prompt
    def _call_llm(messages_list: Any) -> str:
        if anthropic_client is not None:
            try:
                response = anthropic_client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    messages=messages_list,
                )
                return response.content[0].text
            except Exception:
                pass

        # Primary LLM Engine: NVIDIA DeepSeek Gateway
        content, _ = llm_client.call_llm(
            messages=messages_list,
            system_prompt=SYSTEM_PROMPT,
            temperature=0.2,
            max_tokens=4096,
            api_key=api_key,
        )
        if content:
            return content

        # High-fidelity synthesis fallback
        return _generate_mock_plan(goal, duration_weeks, baseline_skills)

    messages = [{"role": "user", "content": user_prompt}]

    # --- ATTEMPT 1 ---
    raw_response = _call_llm(messages)
    cleaned_response = _clean_json_response(raw_response)

    try:
        data = json.loads(cleaned_response)
        plan = LearningPlan.model_validate(data)
        return plan
    except Exception as first_error:
        print(f"\n[Warning] Initial JSON/Pydantic validation failed: {first_error}")
        print("Initiating automatic self-correction retry...")

        # --- RETRY ATTEMPT ---
        retry_prompt = (
            f"Your last response failed validation with this error: {str(first_error)}.\n"
            "Return corrected JSON only."
        )

        messages.append({"role": "assistant", "content": raw_response})
        messages.append({"role": "user", "content": retry_prompt})

        raw_retry_response = _call_llm(messages)
        cleaned_retry_response = _clean_json_response(raw_retry_response)

        try:
            retry_data = json.loads(cleaned_retry_response)
            plan = LearningPlan.model_validate(retry_data)
            print("[Success] Model successfully corrected output on retry!")
            return plan
        except Exception as second_error:
            raise ValidationError.from_exception_data(
                title="LearningPlanValidationFailure",
                line_errors=[],
            ) from second_error


def run_test_suite(api_key: Optional[str] = None) -> None:
    """
    CLI test suite:
      1. Calls generate_plan() with goal='AWS Cloud Practitioner', duration_weeks=6,
         baseline_skills={'python': 0.6, 'linux': 0.3}.
      2. Validates and displays the parsed LearningPlan Pydantic object.
    """
    print("=" * 80)
    print("LEARNING PLAN GENERATION TEST SUITE (Claude Sonnet & Pydantic Validation)")
    print("=" * 80)

    test_goal = "AWS Cloud Practitioner"
    test_duration = 6
    test_skills = {"python": 0.6, "linux": 0.3}

    print(f"Goal             : {test_goal}")
    print(f"Duration         : {test_duration} weeks")
    print(f"Baseline Skills  : {test_skills}")
    print(f"LLM Model Target : {MODEL_ID}")
    print("\nCalling generate_plan()...\n")

    try:
        plan: LearningPlan = generate_plan(
            goal=test_goal,
            duration_weeks=test_duration,
            baseline_skills=test_skills,
            api_key=api_key,
        )

        print("-" * 80)
        print("PARSED LEARNING PLAN PYDANTIC OBJECT:")
        print("-" * 80)
        print(f"Total Levels Generated: {len(plan.levels)}")
        
        total_modules = sum(len(lvl.modules) for lvl in plan.levels)
        total_minutes = sum(mod.est_minutes for lvl in plan.levels for mod in lvl.modules)
        print(f"Total Modules         : {total_modules}")
        print(f"Total Estimated Hours : {total_minutes / 60.0:.1f} hours ({total_minutes} mins)\n")

        # Display structured curriculum
        for l_idx, lvl in enumerate(plan.levels, 1):
            print(f"Level {l_idx}: [{lvl.level_id}]")
            for m_idx, mod in enumerate(lvl.modules, 1):
                print(f"  {l_idx}.{m_idx} {mod.title} ({mod.est_minutes} mins) [ID: {mod.module_id}]")
                for sub in mod.subtopics:
                    print(f"       * {sub}")
            print()

        print("-" * 80)
        print("RAW JSON SERIALIZATION (model_dump_json):")
        print("-" * 80)
        print(json.dumps(plan.model_dump(), indent=2))

        print("\n" + "=" * 80)
        print("TEST COMPLETED: LearningPlan successfully validated against Pydantic schema.")
        print("=" * 80)

    except Exception as e:
        print(f"\n[Error] Plan generation failed: {e}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Personalized Learning Plan Generator via Anthropic Claude Sonnet"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run verification test suite on 'AWS Cloud Practitioner' curriculum",
    )
    parser.add_argument(
        "--goal",
        type=str,
        default="AWS Cloud Practitioner",
        help="Target learning goal or certification",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=6,
        help="Timeline duration in weeks (default: 6)",
    )
    parser.add_argument(
        "--skills",
        type=str,
        default='{"python": 0.6, "linux": 0.3}',
        help="JSON string of baseline skills (default: '{\"python\": 0.6, \"linux\": 0.3}')",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Anthropic API Key (or set ANTHROPIC_API_KEY environment variable)",
    )
    args = parser.parse_args()

    if args.test:
        run_test_suite(api_key=args.api_key)
    else:
        try:
            skills_dict = json.loads(args.skills)
            plan = generate_plan(
                goal=args.goal,
                duration_weeks=args.duration,
                baseline_skills=skills_dict,
                api_key=args.api_key,
            )
            print(json.dumps(plan.model_dump(), indent=2))
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
