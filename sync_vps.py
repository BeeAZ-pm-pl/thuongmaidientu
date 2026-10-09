#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NovaShop - One-Click VPS Synchronizer
Dong bo ma nguon va cau hinh tu may phat trien len VPS Production.
Doc cau hinh tu vps_config.json, sao luu tu dong va restart PM2.
"""

import os
import sys
import json
import time
import paramiko

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vps_config.json")
LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f"[!] Khong tim thay file cau hinh: {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Thu muc va file can dong bo len VPS
SYNC_TARGETS = [
    "admin",
    "client",
    "gateway",
    "services/identity-service/src",
    "services/product-service/src",
    "services/order-service/src",
    "services/notification-service/src",
    "services/chat-service/src",
    "database.sql",
    "ecosystem.config.js",
    "package.json"
]

IGNORE_PATTERNS = [
    "node_modules",
    ".git",
    "backups",
    ".vscode",
    "__pycache__",
    ".DS_Store",
    "npm-debug.log",
    ".env"  # Giu lai .env tren server
]

def should_ignore(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for p in parts:
        if p in IGNORE_PATTERNS or p.endswith(".bak") or p.endswith(".log"):
            return True
    return False

def collect_files():
    file_list = []
    for target in SYNC_TARGETS:
        full_path = os.path.join(LOCAL_ROOT, target.replace("/", os.sep))
        if os.path.isfile(full_path):
            if not should_ignore(target):
                file_list.append(target.replace("\\", "/"))
        elif os.path.isdir(full_path):
            for root, dirs, files in os.walk(full_path):
                dirs[:] = [d for d in dirs if not should_ignore(d)]
                for file in files:
                    local_file = os.path.join(root, file)
                    rel_file = os.path.relpath(local_file, LOCAL_ROOT).replace("\\", "/")
                    if not should_ignore(rel_file):
                        file_list.append(rel_file)
    return sorted(list(set(file_list)))

def main():
    config = load_config()
    host = config.get("host")
    port = config.get("port", 22)
    username = config.get("username", "root")
    password = config.get("password")
    remote_dir = config.get("remote_dir", "/var/www/thuongmaidientu")
    restart_cmd = config.get("pm2_restart_command", "cd /var/www/thuongmaidientu && pm2 restart ecosystem.config.js --update-env && pm2 status")

    print("=" * 60)
    print(f"[*] NOVASHOP VPS SYNC: {host}:{port} -> {remote_dir}")
    print("=" * 60)

    files_to_sync = collect_files()
    print(f"[*] Tim thay {len(files_to_sync)} files can dong bo.")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"[*] Dang ket noi SSH toi {host}...")
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("[+] Ket noi SSH thanh cong!")
    except Exception as e:
        print(f"[!] Loi ket noi SSH: {e}")
        sys.exit(1)

    # 1. Tao backup tren VPS
    print("[*] Dang tao ban sao luu an toan tren VPS tai /root/backups...")
    backup_cmd = f"mkdir -p /root/backups && tar -czf /root/backups/tmdt_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www thuongmaidientu"
    stdin, stdout, stderr = ssh.exec_command(backup_cmd)
    exit_code = stdout.channel.recv_exit_status()
    if exit_code == 0:
        print("[+] Da tao ban sao luu tren VPS thanh cong!")
    else:
        err_msg = stderr.read().decode("utf-8", errors="replace")
        print(f"[!] Canh bao tao backup: {err_msg}")

    # 2. Upload files qua SFTP
    sftp = ssh.open_sftp()
    remote_dirs_created = set()

    count = 0
    total = len(files_to_sync)

    for rel_path in files_to_sync:
        local_path = os.path.join(LOCAL_ROOT, rel_path.replace("/", os.sep))
        remote_path = f"{remote_dir}/{rel_path}"
        remote_parent = "/".join(remote_path.split("/")[:-1])

        if remote_parent not in remote_dirs_created:
            try:
                ssh.exec_command(f"mkdir -p '{remote_parent}'")
                remote_dirs_created.add(remote_parent)
            except Exception:
                pass

        try:
            sftp.put(local_path, remote_path)
            count += 1
            if count % 20 == 0 or count == total:
                print(f"[*] Tien trinh: {count}/{total} files uploaded...")
        except Exception as e:
            print(f"[!] Loi upload {rel_path}: {e}")

    sftp.close()
    print(f"[+] Hoan thanh upload toan bo {count}/{total} files qua SFTP!")

    # 3. Chay restart PM2
    print(f"[*] Dang thuc thi lenh restart dich vu PM2 tren VPS...")
    stdin, stdout, stderr = ssh.exec_command(restart_cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")

    print("\n" + "=" * 60)
    print("KET QUA TRANG THAI PM2 TREN VPS:")
    print("=" * 60)
    print(out)
    if err.strip():
        print("[PM2 Stderr]:\n" + err)

    ssh.close()
    print("=" * 60)
    print(f"[+] DONG BO LEN VPS HOAN TAT! Truy cap web: {config.get('domain')}")
    print("=" * 60)

if __name__ == "__main__":
    main()
