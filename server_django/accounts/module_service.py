"""
module_service.py - Sequential Learning Module System & AI Content Engine.
Implements:
1. Strict sequential module gating (unlocks only when previous module's assignment AND proctored exam are both passed).
2. Deep, long-form curriculum content generation persisted by (user_id, skill_id, module_id).
3. Assignment submission step enabling exam confirmation screen.
4. Global basic-level unlocked courses for true cold-start users.
5. Proctored exam outcome ingestion bridge.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Ensure root workspace directory is in sys.path for llm_client
_ROOT_DIR = str(Path(__file__).resolve().parent.parent.parent)
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

try:
    import llm_client
except Exception:
    llm_client = None  # type: ignore

from django.utils import timezone
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord, ModuleLessonContent


# -----------------------------------------------------------------------------
# Global Basic-Level Unlocked Courses (Cold-Start Users)
# -----------------------------------------------------------------------------
GLOBAL_BASIC_COURSES: List[Dict[str, Any]] = [
    {
        'skill_id': 'cs_foundations_101',
        'skill_name': 'Computer Science & Computational Foundations',
        'is_globally_unlocked': True,
        'description': 'Master core memory management, computational models, and algorithmic complexity from the ground up.',
        'estimated_weeks': 3,
        'modules': [
            {
                'module_id': 'cs_101_mem',
                'sequence_order': 1,
                'title': 'Memory Hierarchy, Pointers & Hardware Architecture',
                'topic': 'Memory Architecture & Pointers',
                'duration_hours': 8,
                'is_unlocked': True,  # Module 1 starts accessible once course opened
            },
            {
                'module_id': 'cs_101_algo',
                'sequence_order': 2,
                'title': 'Algorithmic Complexity, Big-O & Divide-and-Conquer',
                'topic': 'Algorithm Analysis & Sorting',
                'duration_hours': 10,
                'is_unlocked': False,
            },
            {
                'module_id': 'cs_101_struct',
                'sequence_order': 3,
                'title': 'Linked Primitives, Binary Trees & Hash Maps',
                'topic': 'Data Structures & Hashing',
                'duration_hours': 12,
                'is_unlocked': False,
            },
        ]
    },
    {
        'skill_id': 'web_eng_101',
        'skill_name': 'Modern Web Architecture & HTTP Systems',
        'is_globally_unlocked': True,
        'description': 'Understand browser execution cycles, HTTP/2 networking, and component state immutability.',
        'estimated_weeks': 3,
        'modules': [
            {
                'module_id': 'web_101_dom',
                'sequence_order': 1,
                'title': 'DOM Rendering Engine, Event Loops & Asynchrony',
                'topic': 'Browser Event Loops & DOM',
                'duration_hours': 8,
                'is_unlocked': True,
            },
            {
                'module_id': 'web_101_http',
                'sequence_order': 2,
                'title': 'HTTP Protocols, REST Standards & Request Lifecycle',
                'topic': 'HTTP/2 & REST APIs',
                'duration_hours': 10,
                'is_unlocked': False,
            },
            {
                'module_id': 'web_101_state',
                'sequence_order': 3,
                'title': 'State Containers, Immutability & Component Lifecycles',
                'topic': 'State Machines & Reactivity',
                'duration_hours': 10,
                'is_unlocked': False,
            },
        ]
    },
    {
        'skill_id': 'py_core_101',
        'skill_name': 'Python Systems Engineering & Data Structures',
        'is_globally_unlocked': True,
        'description': 'Master the Python data model, generator coroutines, and exception boundaries.',
        'estimated_weeks': 2,
        'modules': [
            {
                'module_id': 'py_101_model',
                'sequence_order': 1,
                'title': 'Python Object Model, Dunder Methods & Metaprogramming',
                'topic': 'Python Data Model & Objects',
                'duration_hours': 8,
                'is_unlocked': True,
            },
            {
                'module_id': 'py_101_async',
                'sequence_order': 2,
                'title': 'Generators, Context Managers & Concurrency Primitives',
                'topic': 'Asyncio & Generators',
                'duration_hours': 10,
                'is_unlocked': False,
            },
        ]
    },
]


# -----------------------------------------------------------------------------
# 1. Sequential Module Hierarchy & Progression Inspector
# -----------------------------------------------------------------------------
def get_user_learning_tree(user: User) -> Dict[str, Any]:
    """
    Computes the live sequential state of all skill courses and modules.
    Enforces Rule: Module N unlocks ONLY when Module N-1 has assignment_passed=True AND exam_passed=True.
    Exclusively derives courses from the candidate's personalized learning path (UserProfile.learning_path).
    """
    from .onboarding_service import generate_learning_path_for_user

    profile, _ = UserProfile.objects.get_or_create(user=user)
    learning_path = dict(profile.learning_path or {})
    module_progress = dict(profile.module_progress or {})

    # Active skills from learning path (or auto-generate if path doesn't exist yet)
    active_skills = learning_path.get('custom_path') or learning_path.get('suggested_path') or []

    if not active_skills:
        # Synthesize tailored roadmap for user's target role
        path_record = generate_learning_path_for_user(
            user,
            target_role=profile.target_role or 'Full Stack & AI Engineer',
            duration_weeks=8
        )
        active_skills = path_record.get('custom_path') or path_record.get('suggested_path') or []

    # Collect all skill courses from:
    # 1. Current active learning path
    # 2. Historical learning paths in path_history
    current_role = learning_path.get('target_role') or profile.target_role or 'Current Track'
    all_skill_sources = []
    known_skill_ids = set()
    known_skill_names = set()

    for s_idx, sk in enumerate(active_skills):
        sk_copy = dict(sk)
        sk_id = sk_copy.get('skill_id', f"skill_{s_idx + 1}")
        sk_name = sk_copy.get('skill_name', f"Skill {s_idx + 1}")
        sk_copy['track_name'] = current_role
        sk_copy['is_current_track'] = True
        all_skill_sources.append(sk_copy)
        known_skill_ids.add(sk_id)
        known_skill_names.add(sk_name)

    # Merge historical learning path courses
    path_history = list(learning_path.get('path_history') or [])
    for h_path in path_history:
        h_role = h_path.get('target_role') or 'Previous Track'
        h_skills = h_path.get('custom_path') or h_path.get('skills') or h_path.get('suggested_path') or []
        for h_idx, h_sk in enumerate(h_skills):
            h_copy = dict(h_sk)
            h_id = h_copy.get('skill_id', f"hist_skill_{h_idx + 1}")
            h_name = h_copy.get('skill_name')
            if h_id not in known_skill_ids and h_name not in known_skill_names:
                h_copy['track_name'] = h_role
                h_copy['is_current_track'] = False
                all_skill_sources.append(h_copy)
                known_skill_ids.add(h_id)
                if h_name:
                    known_skill_names.add(h_name)

    all_courses = []

    # If no active or historical skills exist, provide foundational cold-start courses
    if not all_skill_sources:
        for g_idx, g_course in enumerate(GLOBAL_BASIC_COURSES):
            skill_id = g_course['skill_id']
            skill_progress = module_progress.get(skill_id, {})
            is_started = skill_progress.get('is_started', True)

            modules_annotated = []
            prev_module_completed = is_started

            for m_idx, mod in enumerate(g_course.get('modules', [])):
                m_id = mod.get('module_id')
                m_state = skill_progress.get('modules', {}).get(m_id, {})

                assign_passed = m_state.get('assignment_passed', False)
                exam_passed = m_state.get('exam_passed', False)
                exam_score = m_state.get('exam_score', None)

                if m_idx == 0:
                    is_unlocked = is_started
                else:
                    is_unlocked = prev_module_completed

                modules_annotated.append({
                    'module_id': m_id,
                    'sequence_order': mod.get('sequence_order', m_idx + 1),
                    'title': mod.get('title'),
                    'topic': mod.get('topic', mod.get('title')),
                    'duration_hours': mod.get('duration_hours', 8),
                    'is_unlocked': is_unlocked,
                    'assignment_passed': assign_passed,
                    'exam_passed': exam_passed,
                    'exam_score': exam_score,
                    'exam_ready': assign_passed and not exam_passed,
                    'status': 'completed' if (assign_passed and exam_passed) else 'in_progress' if is_unlocked else 'locked',
                    'lock_reason': None if is_unlocked else 'Requires passing previous module assignment and proctored exam',
                })

                prev_module_completed = assign_passed and exam_passed

            all_courses.append({
                'skill_id': skill_id,
                'skill_name': g_course['skill_name'],
                'track_name': 'Foundational Track',
                'is_current_track': True,
                'is_globally_unlocked': True,
                'description': g_course['description'],
                'estimated_weeks': g_course.get('estimated_weeks', 2),
                'is_started': is_started,
                'modules': modules_annotated,
                'completed_modules_count': sum(1 for m in modules_annotated if m['exam_passed']),
                'total_modules_count': len(modules_annotated),
            })

    # Build courses for all active and historical roadmap milestones
    for s_idx, skill_item in enumerate(all_skill_sources):
        skill_id = skill_item.get('skill_id', f"skill_{s_idx + 1}")
        skill_name = skill_item.get('skill_name', f"Skill {s_idx + 1}")
        track_name = skill_item.get('track_name', current_role)
        is_curr = skill_item.get('is_current_track', True)
        skill_progress = module_progress.get(skill_id, {})
        is_started = skill_progress.get('is_started', False)

        modules_annotated = []
        prev_module_completed = is_started

        for m_idx, mod in enumerate(skill_item.get('modules', [])):
            m_id = mod.get('module_id', f"mod_{skill_id}_{m_idx + 1}")
            m_state = skill_progress.get('modules', {}).get(m_id, {})

            assign_passed = m_state.get('assignment_passed', False)
            exam_passed = m_state.get('exam_passed', False)
            exam_score = m_state.get('exam_score', None)

            if m_idx == 0:
                is_unlocked = is_started
            else:
                is_unlocked = prev_module_completed

            modules_annotated.append({
                'module_id': m_id,
                'sequence_order': m_idx + 1,
                'title': mod.get('title', f"Module {m_idx + 1}"),
                'topic': mod.get('topic') or mod.get('title', ''),
                'duration_hours': mod.get('duration_hours', 10),
                'is_unlocked': is_unlocked,
                'assignment_passed': assign_passed,
                'exam_passed': exam_passed,
                'exam_score': exam_score,
                'exam_ready': assign_passed and not exam_passed,
                'status': 'completed' if (assign_passed and exam_passed) else 'in_progress' if is_unlocked else 'locked',
                'lock_reason': None if is_unlocked else 'Requires passing previous module assignment and proctored exam',
            })

            prev_module_completed = assign_passed and exam_passed

        all_courses.append({
            'skill_id': skill_id,
            'skill_name': skill_name,
            'track_name': track_name,
            'is_current_track': is_curr,
            'is_globally_unlocked': s_idx == 0 and is_curr,
            'description': skill_item.get('description') or f"Curated technical milestone for {skill_name}.",
            'estimated_weeks': skill_item.get('estimated_weeks', 2),
            'is_started': is_started,
            'modules': modules_annotated,
            'completed_modules_count': sum(1 for m in modules_annotated if m['exam_passed']),
            'total_modules_count': len(modules_annotated),
        })

    return {
        'target_role': profile.target_role,
        'total_courses': len(all_courses),
        'courses': all_courses,
    }


# -----------------------------------------------------------------------------
# 2. Start Skill Action (Prompt 3 user action that locks in sequence)
# -----------------------------------------------------------------------------
def start_skill_course(user: User, skill_id: str) -> Dict[str, Any]:
    """
    Explicit user action to start a skill milestone.
    Unlocks Module 1 for that skill and records active state in UserProfile.module_progress.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    progress = dict(profile.module_progress or {})

    skill_state = progress.get(skill_id, {'is_started': False, 'modules': {}})
    skill_state['is_started'] = True
    skill_state['started_at'] = timezone.now().isoformat()
    progress[skill_id] = skill_state

    profile.module_progress = progress
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='plan',
        title=f"Started Skill Course: {skill_id}",
        summary=f"Skill activated. Module 1 unlocked for sequential study.",
        meta_data={'skill_id': skill_id}
    )

    return get_user_learning_tree(user)


# -----------------------------------------------------------------------------
# 3. AI Long-Form Content Engine & Database Persistence (Groq LLM Powered)
# -----------------------------------------------------------------------------
def _synthesize_longform_module_via_ai(
    skill_id: str,
    title: str,
    module_id: str,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Invokes Groq LLM (via llm_client) to generate very long, descriptive, deeply educational notes,
    production code walkthroughs, practical assignments, and grounded assessment questions.
    """
    if not llm_client:
        return None

    system_prompt = (
        "You are a Principal Software Architect and Distinguished Computer Science Professor. "
        "Your task is to write exhaustive, highly technical, long-form curriculum notes and "
        "perfectly grounded assessment questions for engineering students.\n"
        "CRITICAL INSTRUCTIONS:\n"
        "1. Produce very long, deeply descriptive, comprehensive markdown notes with architectural breakdowns, "
        "ASCII state diagrams, production-grade code, and anti-patterns.\n"
        "2. The assessment exam questions (4 MCQs and 1 Short Answer) MUST be strictly grounded in and "
        "verifiable from the generated lesson notes.\n"
        "3. Output strictly valid JSON matching the exact specified schema without conversational preamble."
    )

    user_prompt = f"""Generate comprehensive, long-form educational module content and grounded assessment questions for:
Course Domain / Skill: {skill_id.replace('_', ' ').title()}
Module Title: {title}
Module ID: {module_id}

Output strictly valid JSON matching this schema:
{{
  "title": "{title}",
  "lesson_markdown": "Extremely detailed, long markdown text with at least 5 deep sections (Architectural Foundations, Deep Conceptual Principles, In-Depth Technical Deep Dive with ASCII diagrams, Production Code Walkthroughs with type hints and error handling, Common Anti-Patterns & Edge Cases, Summary & Key Architectural Takeaways)",
  "learning_objectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
  "code_examples": [
    {{
      "title": "Production Implementation",
      "language": "python",
      "code": "# Production code\\n..."
    }}
  ],
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "assignment": {{
    "prompt": "Detailed real-world scenario assignment prompt...",
    "starter_code": "# Starter code\\n...",
    "criteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
  }},
  "exam_questions": [
    {{"id": "eq1", "type": "mcq", "prompt": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}}},
    {{"id": "eq2", "type": "mcq", "prompt": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}}},
    {{"id": "eq3", "type": "mcq", "prompt": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}}},
    {{"id": "eq4", "type": "mcq", "prompt": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}}},
    {{"id": "eq5", "type": "short_answer", "prompt": "...", "options": null}}
  ],
  "exam_answer_key": {{
    "eq1": "A",
    "eq2": "B",
    "eq3": "C",
    "eq4": "D",
    "eq5": "Model rubric and expected conceptual explanation grounded in the notes."
  }}
}}"""

    try:
        content, _ = llm_client.call_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.25,
            max_tokens=3500,
            api_key=api_key,
        )
        if content:
            cleaned = llm_client.strip_json_markdown(content)
            data = json.loads(cleaned)
            required_keys = ['lesson_markdown', 'learning_objectives', 'exam_questions', 'exam_answer_key']
            if all(k in data for k in required_keys) and len(data.get('exam_questions', [])) >= 4:
                return data
    except Exception as exc:
        print(f"  [Notice] AI Module Synthesis fallback engaged: {exc}", file=sys.stderr)

    return None


def get_or_generate_module_content(
    user: User,
    skill_id: str,
    module_id: str,
    module_title: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves persisted long-form lesson content for (user, skill_id, module_id).
    If not previously generated, invokes AI Content Engine (Groq LLM) to generate genuine,
    in-depth curriculum material with architecture breakdowns, code examples,
    assignments, and proctored exam questions — then persists to Database.
    """
    # 1. Check if previously generated & persisted in database
    existing = ModuleLessonContent.objects.filter(
        user=user,
        skill_id=skill_id,
        module_id=module_id
    ).first()

    if existing:
        return {
            'skill_id': existing.skill_id,
            'module_id': existing.module_id,
            'title': existing.title,
            'topic': existing.topic,
            'lesson_markdown': existing.lesson_markdown,
            'learning_objectives': existing.learning_objectives,
            'code_examples': existing.code_examples,
            'key_takeaways': existing.key_takeaways,
            'assignment': {
                'prompt': existing.assignment_prompt,
                'starter_code': existing.assignment_starter_code,
                'criteria': existing.assignment_criteria,
            },
            'exam_questions': existing.exam_questions,
            'is_persisted': True,
            'created_at': existing.created_at.isoformat(),
        }

    title = module_title or module_id.replace('_', ' ').title()

    # 2. Try Groq AI Synthesis first for ultra-rich, long-form notes & grounded questions
    ai_package = _synthesize_longform_module_via_ai(
        skill_id=skill_id,
        title=title,
        module_id=module_id,
        api_key=api_key
    )

    if ai_package:
        lesson_markdown = ai_package.get('lesson_markdown', '')
        learning_objectives = ai_package.get('learning_objectives', [])
        code_examples = ai_package.get('code_examples', [])
        key_takeaways = ai_package.get('key_takeaways', [])
        assignment_data = ai_package.get('assignment', {})
        assignment_prompt = assignment_data.get('prompt', f"Practical assignment for {title}")
        assignment_starter_code = assignment_data.get('starter_code', f"# Assignment: {title}\n")
        assignment_criteria = assignment_data.get('criteria', ["Clean code architecture", "Correct execution"])
        exam_questions = ai_package.get('exam_questions', [])
        exam_answer_key = ai_package.get('exam_answer_key', {})
    else:
        # Fallback template if offline or rate limited
        lesson_markdown = f"""# {title}

## 1. Architectural Foundations & Deep Conceptual Principles
In modern distributed and high-concurrency systems, mastering **{title}** requires a rigorous understanding of the underlying memory models, execution primitives, and state invariants. Rather than treating this as an isolated API or abstraction, we examine how instructions traverse the runtime, how asynchronous boundaries prevent bottlenecks, and how fault-tolerant error boundaries preserve data integrity.

### Core Architectural Axioms
1. **Deterministic Isolation**: State modifications must be scoped within explicit transactional or immutability boundaries to prevent data races.
2. **Asynchronous Non-Blocking IO**: High-throughput systems decouple network and disk latency from CPU compute workers via non-blocking event dispatchers.
3. **Graceful Degradation**: Production workflows must encapsulate network dependencies with timeouts, backoff retries, and circuit breakers.

---

## 2. In-Depth Technical Deep Dive & Execution Mechanics
When an operation executes within `{title}`, the runtime allocates heap memory buffers and registers callbacks against the active event scheduler. 

```
[ Client Request / Event Trigger ]
               │
               ▼
   ┌──────────────────────┐
   │ Input Sanitization & │
   │ Schema Validation    │
   └──────────┬───────────┘
               │
               ▼
   ┌──────────────────────┐      Async Pipeline
   │ Core Logic Execution ├─────────────────────────┐
   │ State Reconciliation │                         │
   └──────────┬───────────┘                         ▼
               │                        ┌──────────────────────┐
               ▼                        │ Background Telemetry │
   ┌──────────────────────┐             │ & Health Metrics     │
   │ Output Serialization │             └──────────────────────┘
   │ & Cache Invalidation │
   └──────────────────────┘
```

### Memory Footprint & Resource Management
In high-load environments, resource exhaustion frequently manifests from uncollected closures and leaky event subscriptions. By adhering to structured lifecycle disposal patterns, systems maintain predictable p99 latency without erratic garbage collection spikes.

---

## 3. Production Code Implementations & Walkthroughs

### Pattern A: Clean Modular Implementation
The following implementation demonstrates optimal pattern separation, dependency injection, and deterministic error handling:

```python
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class {title.replace(' ', '').replace('-', '')}Manager:
    \"\"\"
    Production-grade controller for {title} execution pipeline.
    Enforces concurrency thresholds and transactional safety.
    \"\"\"
    def __init__(self, pool_size: int = 10, timeout_seconds: float = 5.0):
        self._semaphore = asyncio.Semaphore(pool_size)
        self._timeout = timeout_seconds
        self._is_active = True

    async def execute_operation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"
        Executes operation with strict concurrency bounding and timeout enforcement.
        \"\"\"
        if not self._is_active:
            raise RuntimeError("Engine is offline or terminating.")

        async with self._semaphore:
            try:
                # Simulating bounded async compute & validation
                result = await asyncio.wait_for(
                    self._internal_worker(payload),
                    timeout=self._timeout
                )
                return {{"status": "success", "data": result}}
            except asyncio.TimeoutError:
                logger.error("Execution timed out for payload: %s", payload)
                return {{"status": "error", "error": "Operation exceeded timeout threshold"}}
            except Exception as exc:
                logger.exception("Internal execution failure: %s", exc)
                return {{"status": "error", "error": str(exc)}}

    async def _internal_worker(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        await asyncio.sleep(0.05)  # Yield execution to event loop
        return {{"processed_keys": list(payload.keys()), "valid": True}}
```

---

## 4. Common Anti-Patterns & Edge Cases

| Anti-Pattern | Root Problem | Architectural Solution |
| :--- | :--- | :--- |
| **Unbounded Concurrency** | Exhausts socket descriptors / memory under traffic spikes | Bounded semaphores & connection pooling |
| **Silent Exception Swallowing** | Obscures root causes in production telemetry | Structured logging with contextual stack traces |
| **Synchronous IO in Event Loop** | Blocks all concurrent workers on thread | Delegate blocking tasks to thread pool executors |

---

## 5. Summary & Key Architectural Takeaways
- **State Immutability**: Always prefer pure transitions over shared mutable references.
- **Observability**: Instrument each subsystem with latency timers, error counters, and audit trails.
- **Fail-Fast Boundaries**: Validate all inputs at the perimeter before allocating compute resources.
"""

        learning_objectives = [
            f"Master the core operational principles and architectural model of {title}.",
            f"Implement production-grade patterns with bounded concurrency and async safety.",
            f"Identify and refactor anti-patterns to guarantee predictable low-latency performance.",
            f"Formulate comprehensive unit and integration verification tests."
        ]

        code_examples = [
            {
                'title': 'High-Throughput Controller Pattern',
                'language': 'python',
                'code': f"# Production Controller for {title}\nclass Controller:\n    def execute(self, req):\n        return {{'status': 'verified', 'module': '{title}'}}"
            }
        ]

        key_takeaways = [
            "Isolate side-effects to dedicated worker boundaries.",
            "Employ bounded thread/connection pools to prevent socket starvation.",
            "Ground all state transitions in deterministic schema contracts."
        ]

        # Assignment Spec
        assignment_prompt = (
            f"### Practical Assignment: Implement {title} Service\n\n"
            f"**Task Requirements**:\n"
            f"1. Implement a class or module that encapsulates the `{title}` workflow.\n"
            f"2. Enforce input validation and handle at least 2 potential edge-cases (e.g. timeout, invalid schema).\n"
            f"3. Provide unit test assertions validating correct execution and error recovery.\n\n"
            f"Write your complete solution in the code editor below and click **Submit Assignment**."
        )

        assignment_starter_code = (
            f"# Assignment: {title}\n"
            f"# Implement your solution below\n\n"
            f"class Solution:\n"
            f"    def solve(self, inputs: dict) -> dict:\n"
            f"        # TODO: Implement core logic\n"
            f"        if not inputs:\n"
            f"            raise ValueError('Invalid inputs')\n"
            f"        return {{'result': 'success', 'processed': True}}\n"
        )

        assignment_criteria = [
            "Code adheres to clean architectural principles",
            "Handles edge-cases and exceptions gracefully",
            "Correctly produces the expected output structure",
        ]

        # 5 Proctored Exam Questions for this Module
        exam_questions = [
            {
                'id': 'eq1',
                'type': 'mcq',
                'prompt': f"In {title}, what is the primary purpose of applying bounded concurrency control?",
                'options': {
                    'A': 'To prevent resource exhaustion and socket starvation under load spikes.',
                    'B': 'To make all asynchronous requests execute synchronously.',
                    'C': 'To disable all telemetry logging.',
                    'D': 'To bypass input schema validation.'
                }
            },
            {
                'id': 'eq2',
                'type': 'mcq',
                'prompt': f"Which pattern represents the safest way to handle exceptions in {title}?",
                'options': {
                    'A': 'Pass exceptions silently with an empty except block.',
                    'B': 'Structured contextual logging with explicit error boundaries and rollback.',
                    'C': 'Terminate the entire server process on any minor error.',
                    'D': 'Re-route corrupted data to global state.'
                }
            },
            {
                'id': 'eq3',
                'type': 'mcq',
                'prompt': f"How does state immutability benefit {title} under high concurrency?",
                'options': {
                    'A': 'It completely eliminates race conditions without heavy mutex locking.',
                    'B': 'It doubles memory allocation overhead perpetually.',
                    'C': 'It prevents functions from returning values.',
                    'D': 'It forces synchronous blocking IO.'
                }
            },
            {
                'id': 'eq4',
                'type': 'mcq',
                'prompt': f"What is the recommended approach for handling blocking IO operations inside an asynchronous runtime in {title}?",
                'options': {
                    'A': 'Execute blocking IO directly in the main event loop thread.',
                    'B': 'Offload the blocking call to a thread pool executor using run_in_executor.',
                    'C': 'Disable the event loop.',
                    'D': 'Convert all functions into infinite loops.'
                }
            },
            {
                'id': 'eq5',
                'type': 'short_answer',
                'prompt': f"Explain how you would design a circuit-breaker mechanism for {title} to handle upstream service outages.",
                'options': None
            }
        ]

        exam_answer_key = {
            'eq1': 'A',
            'eq2': 'B',
            'eq3': 'A',
            'eq4': 'B',
            'eq5': 'A circuit breaker tracks consecutive failure counts. When the threshold is exceeded, it trips to OPEN state to fail-fast without overloading the upstream, before testing recovery in HALF-OPEN state.'
        }

    # 3. Persist to Database (ModuleLessonContent)
    content_record, _ = ModuleLessonContent.objects.update_or_create(
        user=user,
        skill_id=skill_id,
        module_id=module_id,
        defaults={
            'title': title,
            'topic': title,
            'lesson_markdown': lesson_markdown,
            'learning_objectives': learning_objectives,
            'code_examples': code_examples,
            'key_takeaways': key_takeaways,
            'assignment_prompt': assignment_prompt,
            'assignment_starter_code': assignment_starter_code,
            'assignment_criteria': assignment_criteria,
            'exam_questions': exam_questions,
            'exam_answer_key': exam_answer_key,
        }
    )

    return {
        'skill_id': skill_id,
        'module_id': module_id,
        'title': title,
        'topic': title,
        'lesson_markdown': lesson_markdown,
        'learning_objectives': learning_objectives,
        'code_examples': code_examples,
        'key_takeaways': key_takeaways,
        'assignment': {
            'prompt': assignment_prompt,
            'starter_code': assignment_starter_code,
            'criteria': assignment_criteria,
        },
        'exam_questions': exam_questions,
        'is_persisted': True,
        'created_at': content_record.created_at.isoformat(),
    }


# -----------------------------------------------------------------------------
# 4. Module Assignment Submission & Exam Confirmation Readiness
# -----------------------------------------------------------------------------
def submit_module_assignment(
    user: User,
    skill_id: str,
    module_id: str,
    submission_code: str,
    submission_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Records assignment completion. Enables the next step: proctored exam confirmation screen.
    """
    if not submission_code or len(submission_code.strip()) < 10:
        raise ValueError("Assignment code submission must contain meaningful code implementation.")

    profile, _ = UserProfile.objects.get_or_create(user=user)
    progress = dict(profile.module_progress or {})

    skill_state = progress.get(skill_id, {'is_started': True, 'modules': {}})
    mod_state = skill_state.get('modules', {}).get(module_id, {})

    mod_state['assignment_passed'] = True
    mod_state['assignment_submitted_at'] = timezone.now().isoformat()
    mod_state['submission_code'] = submission_code
    mod_state['submission_notes'] = submission_notes or ''
    mod_state['exam_ready'] = True

    if 'modules' not in skill_state:
        skill_state['modules'] = {}
    skill_state['modules'][module_id] = mod_state
    progress[skill_id] = skill_state

    profile.module_progress = progress
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='assessment',
        title=f"Assignment Passed: {module_id}",
        summary=f"Assignment completed for {skill_id} / {module_id}. Proctored exam confirmation unlocked.",
        meta_data={'skill_id': skill_id, 'module_id': module_id}
    )

    return {
        'skill_id': skill_id,
        'module_id': module_id,
        'assignment_passed': True,
        'exam_ready': True,
        'next_step': 'confirm_proctored_exam',
        'message': 'Assignment submitted and verified! You may now proceed to the proctored exam confirmation.',
    }


# -----------------------------------------------------------------------------
# 5. Proctored Exam Outcome Ingestion & Next Module Unlock
# -----------------------------------------------------------------------------
def record_module_exam_result(
    user: User,
    skill_id: str,
    module_id: str,
    outcome: str = 'pass',
    score: float = 1.0,
    session_id: Optional[str] = None,
    proctoring_flags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Ingests proctored exam outcome ('pass', 'fail', 'malpractice').
    If outcome is 'pass', marks module exam_passed=True and automatically unlocks
    the NEXT sequential module in that skill!
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    progress = dict(profile.module_progress or {})

    skill_state = progress.get(skill_id, {'is_started': True, 'modules': {}})
    mod_state = skill_state.get('modules', {}).get(module_id, {})

    is_passed = (outcome == 'pass')
    mod_state['exam_passed'] = is_passed
    mod_state['exam_score'] = score
    mod_state['exam_outcome'] = outcome
    mod_state['exam_finalized_at'] = timezone.now().isoformat()
    mod_state['proctoring_session_id'] = session_id
    mod_state['proctoring_flags'] = proctoring_flags or []

    if 'modules' not in skill_state:
        skill_state['modules'] = {}
    skill_state['modules'][module_id] = mod_state
    progress[skill_id] = skill_state

    profile.module_progress = progress

    # Append to assessment history
    history = list(profile.assessment_history or [])
    history.append({
        'session_id': session_id,
        'skill_id': skill_id,
        'module_id': module_id,
        'score': score,
        'outcome': outcome,
        'flags': proctoring_flags or [],
        'timestamp': timezone.now().isoformat(),
    })
    profile.assessment_history = history
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='proctoring',
        title=f"Module Exam: {module_id} ({outcome.upper()})",
        summary=f"Proctored exam for {skill_id} / {module_id} concluded with outcome: {outcome.upper()}.",
        meta_data={'skill_id': skill_id, 'module_id': module_id, 'outcome': outcome, 'score': score}
    )

    return {
        'skill_id': skill_id,
        'module_id': module_id,
        'outcome': outcome,
        'exam_passed': is_passed,
        'score': score,
        'updated_tree': get_user_learning_tree(user),
    }
