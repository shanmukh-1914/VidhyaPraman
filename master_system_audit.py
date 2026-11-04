"""
master_system_audit.py - Entrypoint alias pointing to tests/master_system_audit.py.
Maintains backward compatibility for AWS deployment audits, CI/CD scripts, and manual test runs.
"""
import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
_DJANGO_DIR = os.path.join(_PROJECT_ROOT, "server_django")
_TEST_DIR = os.path.join(_PROJECT_ROOT, "tests")

for _path in (_PROJECT_ROOT, _DJANGO_DIR, _TEST_DIR):
    if _path not in sys.path:
        sys.path.insert(0, _path)

_TARGET = os.path.join(_TEST_DIR, "master_system_audit.py")
if os.path.exists(_TARGET):
    with open(_TARGET, "r", encoding="utf-8") as _f:
        exec(compile(_f.read(), _TARGET, "exec"), globals())
else:
    raise FileNotFoundError(f"Master system audit script not found at {_TARGET}")

