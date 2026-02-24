# test_runner.py

import subprocess
import sys
import os

def main():
    print("\n🚀 Running InferStream Backend Tests...\n")

    # Check if pytest is installed
    try:
        import pytest  # noqa
    except ImportError:
        print("❌ pytest not installed. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pytest", "pytest-asyncio", "pytest-cov"])

    # Define test command
    cmd = [
        "pytest",
        "tests/",
        "--asyncio-mode=auto",
        "--cov=backend",               # Include coverage if enabled
        "--cov-report=term-missing",  # Show missing lines
        "--color=yes",
        "-v"
    ]

    # Run the test suite
    try:
        subprocess.run(cmd, check=True)
        print("\n✅ All tests completed successfully.\n")
    except subprocess.CalledProcessError:
        print("\n❌ Test suite failed. Please check logs above.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
