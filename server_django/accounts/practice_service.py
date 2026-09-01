"""
practice_service.py - Self-Test Practice Sandbox Engine (Strictly Stateless & Isolated).
CRITICAL SYSTEM INVARIANT:
- This service is purely in-memory and stateless.
- It DOES NOT write to UserProfile.skills_matrix, module_progress, assessment_history, badges, certifications, or UserActivityRecord.
- Scores and answers are computed in-memory, returned to the client, and immediately discarded from memory.
"""

import json
import random
from typing import Dict, Any, List, Optional


# -----------------------------------------------------------------------------
# Curated Practice Question Bank (Covering Any Technical Domain)
# -----------------------------------------------------------------------------
PRACTICE_DOMAINS = {
    'python': {
        'name': 'Python Core & Advanced Internals',
        'questions': [
            {
                'id': 'pr_py_1',
                'prompt': 'How does Python handle memory management for small integers (-5 to 256)?',
                'options': {
                    'A': 'Allocates dynamic heap buffers on every reference',
                    'B': 'Pre-allocates an integer object array in global interpreter memory (interning)',
                    'C': 'Converts them to C long primitives with zero object header',
                    'D': 'Delegates allocation to the underlying operating system virtual page table'
                },
                'correct_answer': 'B',
                'explanation': 'Python pre-allocates an array of integer objects for integers in the range [-5, 256]. Any reference to an integer in this range reuses the singleton interned object.'
            },
            {
                'id': 'pr_py_2',
                'prompt': 'What occurs under the Global Interpreter Lock (GIL) in CPython when a CPU-bound thread executes?',
                'options': {
                    'A': 'The OS kernel distributes bytecode instructions across all available hardware cores simultaneously',
                    'B': 'Only one thread can execute Python bytecode at a time, releasing the GIL periodically based on interval ticks',
                    'C': 'All threads are terminated and replaced with fork subprocesses',
                    'D': 'The GIL is automatically disabled when using asyncio coroutines'
                },
                'correct_answer': 'B',
                'explanation': 'CPython’s GIL ensures that only one native thread executes Python bytecode at any instant, preventing memory corruption in non-thread-safe C extensions.'
            },
            {
                'id': 'pr_py_3',
                'prompt': 'Which method is invoked by the `async with` context manager protocol upon entering the block?',
                'options': {
                    'A': '__enter__()',
                    'B': '__aenter__()',
                    'C': '__await__()',
                    'D': '__init_async__()'
                },
                'correct_answer': 'B',
                'explanation': 'The asynchronous context manager protocol requires `__aenter__()` returning an awaitable upon entering and `__aexit__()` upon exit.'
            },
            {
                'id': 'pr_py_4',
                'prompt': 'What is the primary architectural difference between `deepcopy` and `copy` in the standard library?',
                'options': {
                    'A': '`copy` creates a shallow copy where child references point to the original objects; `deepcopy` recursively clones all nested objects',
                    'B': '`copy` is thread-safe while `deepcopy` requires a mutex lock',
                    'C': '`deepcopy` converts objects to JSON strings and reparses them',
                    'D': 'There is no functional difference'
                },
                'correct_answer': 'A',
                'explanation': 'Shallow copies duplicate the container object while referencing the same child elements. Deep copies recursively construct new copies of all referenced children.'
            },
            {
                'id': 'pr_py_5',
                'prompt': 'In Python descriptors, which method signature implements a data descriptor setting a value?',
                'options': {
                    'A': '__set__(self, instance, value)',
                    'B': '__put__(self, key, val)',
                    'C': '__assign__(self, obj, val)',
                    'D': '__mutate__(self, instance, target)'
                },
                'correct_answer': 'A',
                'explanation': 'A data descriptor defines `__set__()` or `__delete__()` in addition to `__get__()`.'
            }
        ]
    },
    'react': {
        'name': 'React & Frontend Architecture',
        'questions': [
            {
                'id': 'pr_react_1',
                'prompt': 'What is the primary purpose of React Fiber reconciliation architecture?',
                'options': {
                    'A': 'To compile JSX directly to WebAssembly bytecode',
                    'B': 'To enable incremental rendering, pause/abort work, and assign priorities to UI updates',
                    'C': 'To replace CSS animations with WebGL shaders',
                    'D': 'To eliminate the need for virtual DOM comparisons entirely'
                },
                'correct_answer': 'B',
                'explanation': 'React Fiber is a complete rewrite of the reconciliation engine designed to split rendering work into units of work that can be paused, resumed, or aborted based on priority.'
            },
            {
                'id': 'pr_react_2',
                'prompt': 'When should `useCallback` be applied to a component callback function?',
                'options': {
                    'A': 'On every function declared in any React component regardless of context',
                    'B': 'When passing callbacks to memoized child components (`React.memo`) to prevent unnecessary re-renders from referential inequality',
                    'C': 'To make synchronous network requests in the background',
                    'D': 'To mutate component state directly without triggering a re-render'
                },
                'correct_answer': 'B',
                'explanation': '`useCallback` caches a function definition between renders so that memoized child components relying on referential equality do not needlessly re-render.'
            },
            {
                'id': 'pr_react_3',
                'prompt': 'What will occur if you mutate a state array directly (e.g. `items.push(newItem)`) and call `setItems(items)`?',
                'options': {
                    'A': 'React will immediately trigger a sub-millisecond render cycle',
                    'B': 'React will bail out of re-rendering because `Object.is(prev, next)` evaluates to true due to referential identity',
                    'C': 'React will throw an unhandled InvariantViolationException',
                    'D': 'The entire browser window will crash'
                },
                'correct_answer': 'B',
                'explanation': 'State updates rely on shallow comparison with `Object.is`. Mutating the same array preserves its reference pointer, causing React to skip the render step.'
            }
        ]
    },
    'system_design': {
        'name': 'System Design & Distributed Architecture',
        'questions': [
            {
                'id': 'pr_sys_1',
                'prompt': 'Under the CAP theorem, how does a partitioned network partition (P) force a trade-off?',
                'options': {
                    'A': 'Between database storage capacity and network latency',
                    'B': 'Between Consistency (every read receives the most recent write) and Availability (every non-failing node returns a non-error response)',
                    'C': 'Between CPU core allocation and memory garbage collection',
                    'D': 'Between client-side encryption and server-side hashing'
                },
                'correct_answer': 'B',
                'explanation': 'When a network partition (P) occurs, a distributed system must choose between guaranteeing consistency (CP) or guaranteeing availability (AP).'
            },
            {
                'id': 'pr_sys_2',
                'prompt': 'What is the primary benefit of Consistent Hashing in distributed caching nodes?',
                'options': {
                    'A': 'Guarantees $O(1)$ disk seek times on mechanical hard drives',
                    'B': 'Minimizes the number of keys that must be remapped when nodes are added or removed (only $K/n$ keys)',
                    'C': 'Eliminates all cache invalidation events completely',
                    'D': 'Encrypts cache keys using AES-256'
                },
                'correct_answer': 'B',
                'explanation': 'Consistent hashing maps both keys and servers to points on a virtual ring. When a server node fails or joins, only a fraction ($K/N$) of keys are remapped.'
            }
        ]
    },
    'docker_k8s': {
        'name': 'Docker, Containers & Cloud Infrastructure',
        'questions': [
            {
                'id': 'pr_dock_1',
                'prompt': 'What Linux kernel primitives provide resource limits (CPU, memory) and process isolation for Docker containers?',
                'options': {
                    'A': 'cgroups (Control Groups) for resource limiting and Namespaces for process isolation',
                    'B': 'cron daemons and systemd timers',
                    'C': 'iptables packet routing and BPF filters',
                    'D': 'PAM authentication modules and SELinux policies'
                },
                'correct_answer': 'A',
                'explanation': 'Linux Control Groups (cgroups) allocate and limit hardware resources, while Namespaces (PID, NET, MNT, IPC, UTS) isolate system resources per container.'
            }
        ]
    }
}


# -----------------------------------------------------------------------------
# Stateless Self-Test Practice Question Generator
# -----------------------------------------------------------------------------
def generate_stateless_practice_test(
    topic: str,
    num_questions: int = 5,
    difficulty: str = 'medium'
) -> Dict[str, Any]:
    """
    Generates a set of practice questions for ANY topic using dynamic LLM generation.
    GUARANTEE: Purely in-memory generation. Zero database writes.
    """
    clean_topic = topic.strip()
    
    # 1. Attempt dynamic generation via LLM gateway
    try:
        import llm_client
        system_prompt = (
            "You are an expert technical interviewer and educator for Vidhya Praman.\n"
            f"Generate exactly {num_questions} high-quality Multiple Choice Practice Questions on the topic: '{clean_topic}'.\n"
            "CRITICAL REQUIREMENTS:\n"
            f"1. Exactly {num_questions} MCQs (id 'pr_1' to 'pr_{num_questions}') with 4 distinct options ('A', 'B', 'C', 'D').\n"
            "2. Randomly distribute correct answers across A, B, C, and D.\n"
            "3. Include a clear, comprehensive explanation for why the correct answer is right.\n"
            f"4. Difficulty: {difficulty}.\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "topic": "' + clean_topic + '",\n'
            '  "questions": [\n'
            '    {"id": "pr_1", "prompt": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}}\n'
            '  ],\n'
            '  "answer_key": {"pr_1": "A"},\n'
            '  "explanations": {"pr_1": "..."}\n'
            "}\n"
            "Do NOT include backticks or markdown preamble."
        )

        content, _ = llm_client.call_llm(
            prompt=f"Topic: {clean_topic}\nQuestions requested: {num_questions}",
            system_prompt=system_prompt,
            temperature=0.4,
            max_tokens=2048,
            timeout=8.0
        )

        if content:
            cleaned = llm_client.strip_json_markdown(content)
            parsed = json.loads(cleaned)
            qs = parsed.get('questions', [])
            ak = parsed.get('answer_key', {})
            ex = parsed.get('explanations', {})
            if len(qs) == num_questions and len(ak) == num_questions:
                return {
                    'topic': clean_topic,
                    'difficulty': difficulty,
                    'total_questions': len(qs),
                    'questions': qs,
                    'answer_key': ak,
                    'explanations': ex,
                    'is_proctored': False,
                    'database_persistence': False,
                    'model_source': 'nvidia-deepseek-dynamic',
                    'privacy_guarantee': 'Strictly unpersisted in-memory sandbox. Zero writes to user profile, progress, or activity logs.',
                }
    except Exception as e:
        print(f"[Practice Test Sandbox] LLM note: {e}")

    # 2. Rich Preset & Distinct Multi-Topic Fallback Generator
    topic_lower = clean_topic.lower()
    selected_questions = []

    # Check known domain match
    matched_domain = None
    for domain_key, domain_data in PRACTICE_DOMAINS.items():
        if domain_key in topic_lower or any(word in topic_lower for word in domain_key.split('_')):
            matched_domain = domain_data
            break

    if matched_domain:
        pool = list(matched_domain['questions'])
        random.shuffle(pool)
        selected_questions = pool[:num_questions]

    # If more needed, generate varied distinct conceptual questions
    SUBTOPICS = [
        ("Concurrency & Thread Safety", "How does {topic} prevent memory corruption when state is accessed across concurrent threads?", "Enforce immutable boundaries or thread-safe atomic data types.", "B"),
        ("Asynchronous Event Processing", "What is the primary benefit of non-blocking I/O event loops in {topic}?", "Allows handling thousands of concurrent connections on single OS threads without stack overhead.", "C"),
        ("Error Recovery & Circuit Breaking", "What is the standard resilience pattern in {topic} when downstream dependencies experience elevated latency?", "Implement exponential backoff retry policies with circuit breakers.", "A"),
        ("Memory & Resource Reclamation", "How does {topic} optimize resource allocation during high throughput execution?", "Pre-allocates buffers and manages pooling to minimize garbage collection pauses.", "D"),
        ("API Contracts & Type Invariance", "Why is strict interface typing recommended when architecting large {topic} systems?", "Enforces compile-time correctness and eliminates unhandled runtime type conversions.", "B"),
    ]

    if len(selected_questions) < num_questions:
        needed = num_questions - len(selected_questions)
        for i in range(needed):
            idx = i % len(SUBTOPICS)
            sub_title, sub_stem, correct_exp, correct_letter = SUBTOPICS[idx]
            q_id = f"pr_custom_{len(selected_questions)+1}"
            
            letters = ["A", "B", "C", "D"]
            opts = {
                "A": f"Implement immutable boundaries, circuit breaking, and telemetry monitoring in {clean_topic}.",
                "B": f"Apply asynchronous event loop scheduling and thread-safe data structures for {clean_topic}.",
                "C": f"Utilize non-blocking connection pooling and resource isolation across {clean_topic} services.",
                "D": f"Pre-allocate memory buffers and configure automated rate limiters in {clean_topic}.",
            }
            
            selected_questions.append({
                'id': q_id,
                'prompt': f"[{clean_topic} • {sub_title}] {sub_stem.format(topic=clean_topic)}",
                'options': opts,
                'correct_answer': correct_letter,
                'explanation': f"In {clean_topic}: {correct_exp}"
            })

    # Prepare public questions
    public_questions = []
    answer_key = {}
    explanations = {}

    for q in selected_questions:
        public_questions.append({
            'id': q['id'],
            'prompt': q['prompt'],
            'options': q['options'],
        })
        answer_key[q['id']] = q['correct_answer']
        explanations[q['id']] = q['explanation']

    return {
        'topic': clean_topic,
        'difficulty': difficulty,
        'total_questions': len(public_questions),
        'questions': public_questions,
        'answer_key': answer_key,
        'explanations': explanations,
        'is_proctored': False,
        'database_persistence': False,
        'model_source': 'vidhya-praman-sandboxed-engine',
        'privacy_guarantee': 'Strictly unpersisted in-memory sandbox. Zero writes to user profile, progress, or activity logs.',
    }


# -----------------------------------------------------------------------------
# Stateless In-Memory Grading
# -----------------------------------------------------------------------------
def grade_stateless_practice_test(
    questions: List[Dict[str, Any]],
    answer_key: Dict[str, str],
    explanations: Dict[str, str],
    learner_answers: Dict[str, str]
) -> Dict[str, Any]:
    """
    Evaluates learner answers in-memory and returns instant feedback.
    GUARANTEE: Zero database writes or profile mutations.
    """
    correct_count = 0
    total = len(questions)
    detailed_breakdown = []

    for q in questions:
        qid = q.get('id')
        correct_ans = answer_key.get(qid, 'A')
        user_ans = learner_answers.get(qid, '')
        is_correct = (user_ans.strip().upper() == correct_ans.strip().upper())

        if is_correct:
            correct_count += 1

        detailed_breakdown.append({
            'id': qid,
            'prompt': q.get('prompt'),
            'options': q.get('options'),
            'user_answer': user_ans,
            'correct_answer': correct_ans,
            'is_correct': is_correct,
            'explanation': explanations.get(qid, 'Conceptual reinforcement.'),
        })

    score_ratio = (correct_count / total) if total > 0 else 0.0
    percentage = round(score_ratio * 100, 1)

    return {
        'total_questions': total,
        'correct_count': correct_count,
        'score_percentage': f"{percentage}%",
        'score_ratio': score_ratio,
        'detailed_breakdown': detailed_breakdown,
        'database_persistence': False,
        'is_proctored': False,
        'summary': f"Scored {correct_count}/{total} ({percentage}%) on self-test practice. Results are not stored.",
    }
