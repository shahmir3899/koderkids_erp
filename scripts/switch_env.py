"""
Environment Toggle Script
Switches between local development and production environments,
and optionally starts both servers.

Usage:
    python scripts/switch_env.py local        # switch to local & start servers
    python scripts/switch_env.py prod         # switch to prod & start servers
    python scripts/switch_env.py local --no-start  # switch only, don't start
    python scripts/switch_env.py prod --no-start   # switch only, don't start
"""

import sys
import os
import re
import subprocess
import signal

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TOGGLES = {
    os.path.join("frontend", ".env"): {
        "REACT_APP_API_URL": {
            "local": "http://127.0.0.1:8000",
            "prod": "https://koderkids-erp.onrender.com",
        },
    },
    os.path.join("backend", ".env"): {
        "NGROK_URL": {
            "local": "http://127.0.0.1:8000",
            "prod": "https://koderkids-erp.onrender.com",
        },
        "FRONTEND_URL": {
            "local": "http://localhost:3000",
            "prod": "https://portal.koderkids.pk",
        },
    },
}


def switch_env(env_file_rel, variables, mode):
    env_file = os.path.join(PROJECT_ROOT, env_file_rel)

    if not os.path.exists(env_file):
        print(f"  WARNING: {env_file_rel} not found, skipping.")
        return

    with open(env_file, "r") as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        stripped = line.lstrip("#").strip()
        matched = False

        for var_name, values in variables.items():
            active_val = values[mode]
            inactive_val = values["local" if mode == "prod" else "prod"]

            # Check if this line is about this variable (commented or not)
            pattern = rf"^#?\s*{re.escape(var_name)}\s*="
            if re.match(pattern, line.strip()):
                # Determine if this line has the active or inactive value
                if active_val in line or active_val in stripped:
                    # This line should be active (uncommented)
                    new_line = f"{var_name}={active_val}\n"
                    new_lines.append(new_line)
                    matched = True
                    break
                elif inactive_val in line or inactive_val in stripped:
                    # This line should be commented out
                    new_line = f"#{var_name}={inactive_val}\n"
                    new_lines.append(new_line)
                    matched = True
                    break

        if not matched:
            new_lines.append(line)

    with open(env_file, "w") as f:
        f.writelines(new_lines)


def start_servers(mode):
    backend_dir = os.path.join(PROJECT_ROOT, "backend")
    frontend_dir = os.path.join(PROJECT_ROOT, "frontend")

    print("Starting backend server...")
    backend = subprocess.Popen(
        ["python", "manage.py", "runserver"],
        cwd=backend_dir,
    )

    print("Starting frontend server...")
    frontend = subprocess.Popen(
        ["npm", "start"],
        cwd=frontend_dir,
        shell=True,
    )

    label = "LOCAL" if mode == "local" else "PROD"
    print(f"\nBoth servers running [{label}]. Press Ctrl+C to stop both.\n")

    def shutdown(sig, frame):
        print("\nShutting down...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    backend.wait()
    frontend.wait()


def main():
    args = sys.argv[1:]
    no_start = "--no-start" in args
    args = [a for a in args if a != "--no-start"]

    if len(args) != 1 or args[0] not in ("local", "prod"):
        print("Usage: python scripts/switch_env.py <local|prod> [--no-start]")
        sys.exit(1)

    mode = args[0]
    label = "LOCAL development" if mode == "local" else "PRODUCTION"
    print(f"\nSwitching to {label} environment...\n")

    for env_file, variables in TOGGLES.items():
        print(f"  {env_file}:")
        for var_name, values in variables.items():
            print(f"    {var_name} = {values[mode]}")
        switch_env(env_file, variables, mode)

    print(f"\nDone! Environment set to {label}.\n")

    if not no_start:
        start_servers(mode)


if __name__ == "__main__":
    main()
