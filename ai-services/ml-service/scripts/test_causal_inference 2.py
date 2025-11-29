#!/usr/bin/env python3
"""
🧪 PYTEST WRAPPER FOR DIVINE CAUSAL INFERENCE TESTS
=================================================

This script is a simplified wrapper to run the pytest suite for the divine
causal inference system. It correctly handles pytest arguments and plugins.

Usage:
    python test_causal_inference.py [--verbose] [--benchmark] [--coverage]

"Testing is the divine validation of causal understanding."
"""

import argparse
import subprocess
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='Divine Causal Inference Test Runner')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')
    parser.add_argument('--benchmark', '-b', action='store_true', help='Run performance benchmarks')
    parser.add_argument('--coverage', '-c', action='store_true', help='Generate coverage report')
    
    args = parser.parse_args()

    print("🧪 Starting Divine Causal Inference Test Suite with pytest...")
    print("🔗 DIVINE CAUSAL INFERENCE TEST SUITE")
    print("=" * 50)

    pytest_cmd = [sys.executable, '-m', 'pytest']
    
    # Point pytest to the tests directory
    test_dir = os.path.join(os.path.dirname(__file__), '..', 'tests')
    pytest_cmd.append(test_dir)

    if args.verbose:
        pytest_cmd.append('-v')
        # -s is often used with verbose to show print statements, but it can interfere
        # with pytest's capture mechanisms. For a simple wrapper, let's avoid it for now.
        # If detailed stdout/stderr is needed, it should be handled by pytest's own capture.

    if args.benchmark:
        pytest_cmd.append('--benchmark-skip=False') # Ensure benchmarks are run

    if args.coverage:
        pytest_cmd.extend(['--cov=src/coinet_ai_ml/continual_learning', '--cov-report=term-missing', '--cov-report=html'])

    try:
        # Execute pytest
        result = subprocess.run(pytest_cmd, cwd=os.path.dirname(__file__), check=False)
        return result.returncode
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
