#!/bin/env python3
"""
Environment Validation Script
Checks that all required environment variables are properly set.
"""
import os
import sys
from typing import List, Dict, Any

# Required environment variables for development
REQUIRED_VARS = {
    'DATABASE_URL': 'PostgreSQL database connection',
    'REDIS_URL': 'Redis connection for messaging and caching',
}

# Optional environment variables with defaults
OPTIONAL_VARS = {
    'MCP_URL': 'Mock MCP service URL',
    'ONNX_MODEL_PATH': 'Path to ONNX model files',
    'FINBERT_URL': 'FinBERT server URL (optional)',
    'TRT_ENGINE_PATH': 'TensorRT engine path (optional)',
    'REWARD_SCALE': 'Trading reward scale parameter',
    'LOSS_MULTIPLIER': 'Trading loss multiplier parameter',
    'MIN_SIGNAL_THRESHOLD': 'Minimum signal threshold',
    'MAX_POSITION_SIZE': 'Maximum position size',
}

def check_environment() -> Dict[str, Any]:
    """Check environment variables and return status report."""
    report = {
        'required_missing': [],
        'required_present': [],
        'optional_present': [],
        'optional_missing': [],
        'all_vars': {}
    }
    
    # Check required variables
    for var, description in REQUIRED_VARS.items():
        value = os.environ.get(var)
        if value:
            report['required_present'].append((var, description, value))
        else:
            report['required_missing'].append((var, description))
        report['all_vars'][var] = value
    
    # Check optional variables
    for var, description in OPTIONAL_VARS.items():
        value = os.environ.get(var)
        if value:
            report['optional_present'].append((var, description, value))
        else:
            report['optional_missing'].append((var, description))
        report['all_vars'][var] = value
    
    return report

def print_report(report: Dict[str, Any]) -> bool:
    """Print environment validation report. Returns True if all required vars are present."""
    print("🔍 AITrader Environment Validation")
    print("=" * 50)
    
    # Required variables
    if report['required_present']:
        print("✅ Required Variables (Present):")
        for var, desc, value in report['required_present']:
            # Mask sensitive values
            display_value = value[:20] + "..." if len(value) > 20 else value
            if 'password' in var.lower() or 'secret' in var.lower() or 'token' in var.lower():
                display_value = "***MASKED***"
            print(f"   {var}: {display_value}")
        print()
    
    if report['required_missing']:
        print("❌ Required Variables (Missing):")
        for var, desc in report['required_missing']:
            print(f"   {var}: {desc}")
        print()
        print("💡 Fix: Copy .env.example to .env and configure required variables")
        print("   cp .env.example .env")
        print()
    
    # Optional variables
    if report['optional_present']:
        print("⚙️  Optional Variables (Present):")
        for var, desc, value in report['optional_present']:
            display_value = value[:30] + "..." if len(value) > 30 else value
            print(f"   {var}: {display_value}")
        print()
    
    if report['optional_missing']:
        print("ℹ️  Optional Variables (Using defaults):")
        for var, desc in report['optional_missing']:
            print(f"   {var}: {desc}")
        print()
    
    # Summary
    required_ok = len(report['required_missing']) == 0
    total_vars = len(REQUIRED_VARS) + len(OPTIONAL_VARS)
    present_vars = len(report['required_present']) + len(report['optional_present'])
    
    print(f"📊 Summary: {present_vars}/{total_vars} variables configured")
    
    if required_ok:
        print("✅ Environment is ready for development!")
        return True
    else:
        print("❌ Environment setup incomplete. Please configure missing required variables.")
        return False

def main():
    """Main entry point."""
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("Usage: python scripts/check_env.py")
        print("Validates AITrader environment variable configuration.")
        return
    
    report = check_environment()
    success = print_report(report)
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()