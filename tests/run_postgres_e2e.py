"""실제 브라우저 E2E. sibling 백엔드의 chungpamo_test만 초기화한다.

실행: ..\decision-supporter\.venv\Scripts\python.exe tests\run_postgres_e2e.py
개발 DB·기존 Docker 자원에는 쓰지 않는다. 비밀번호를 명령행/로그에 출력하지 않는다.
"""
import csv
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

from dotenv import dotenv_values
from openpyxl import Workbook
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

FRONT = Path(__file__).resolve().parents[1]
BACK = FRONT.parent / "decision-supporter"
ARTIFACTS = FRONT / ".e2e"


def main():
    url = make_url(dotenv_values(BACK / ".env")["DATABASE_URL"])
    assert (url.drivername, url.host, url.port, url.username, url.database) == (
        "postgresql+psycopg", "127.0.0.1", 55432, "chungpamo_app", "chungpamo")
    info = json.loads(subprocess.check_output(["docker", "inspect", "chungpamo-mvp-db"], text=True, encoding="utf-8"))[0]
    assert info["Config"]["Labels"]["com.docker.compose.project"] == "chungpamo-mvp"
    assert info["State"]["Health"]["Status"] == "healthy"
    assert any(m.get("Name") == "chungpamo-mvp-pgdata" for m in info["Mounts"])
    for port in (8001, 5174):
        with socket.socket() as sock:
            assert sock.connect_ex(("127.0.0.1", port)) != 0, f"E2E port {port} occupied; refusing reuse"
    ARTIFACTS.mkdir(exist_ok=True)
    engine = create_engine(url.set(database="chungpamo_test"))
    with engine.begin() as connection:
        assert connection.execute(text("SELECT current_database()")).scalar_one() == "chungpamo_test"
        connection.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    env = {**os.environ, "DATABASE_URL": url.set(database="chungpamo_test").render_as_string(hide_password=False),
           "PERSISTENCE": "postgres", "CORS_ALLOW_ORIGINS": "http://127.0.0.1:5174"}
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACK / "backend", env=env, check=True)
    wb = Workbook()
    for row in csv.reader(io.StringIO((BACK / "contracts/examples/sample_products.csv").read_text(encoding="utf-8-sig"))):
        wb.active.append(row)
    wb.save(ARTIFACTS / "products.xlsx")
    from engine.tools.make_forecast_examples import build_request
    forecast_rows = build_request()["rows"]
    with (ARTIFACTS / "forecast-products.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["product_id", "product_name", "base_unit"])
        for product in sorted({r["product_id"] for r in forecast_rows} - {"0001001"}):
            writer.writerow([product, f"Synthetic {product}", "EA"])
    with (ARTIFACTS / "forecast-demand.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["product_id", "period", "demand_qty", "unit"])
        writer.writerows([r["product_id"], r["period"], r["demand_qty"], r["unit"]] for r in forecast_rows)
    node = shutil.which("node")
    assert node
    cli = FRONT / "node_modules/@playwright/test/cli.js"
    test_env = {**os.environ, "PLAYWRIGHT_TRANSFORM_CACHE_DIR": str(ARTIFACTS / "transform-cache")}
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    log = (ARTIFACTS / "backend.log").open("w", encoding="utf-8")

    def start():
        process = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
                                   cwd=BACK / "backend", env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=flags)
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            assert process.poll() is None, "E2E backend exited; inspect .e2e/backend.log"
            try:
                with urllib.request.urlopen("http://127.0.0.1:8001/health", timeout=1) as response:
                    if response.status == 200:
                        return process
            except OSError:
                time.sleep(0.1)
        process.terminate()
        process.wait(timeout=10)
        raise RuntimeError("E2E backend health timeout")

    process = None
    frontend = None
    front_log = (ARTIFACTS / "frontend.log").open("w", encoding="utf-8")
    try:
        process = start()
        frontend = subprocess.Popen([node, str(FRONT / "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5174", "--strictPort"],
                                    cwd=FRONT, env={**os.environ, "VITE_API_URL": "http://127.0.0.1:8001"},
                                    stdout=front_log, stderr=subprocess.STDOUT, creationflags=flags)
        deadline = time.monotonic() + 20
        while True:
            assert frontend.poll() is None, "E2E frontend exited; inspect .e2e/frontend.log"
            try:
                with urllib.request.urlopen("http://127.0.0.1:5174", timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                assert time.monotonic() < deadline, "E2E frontend health timeout"
                time.sleep(0.1)
        subprocess.run([node, str(cli), "test", "--grep-invert", "restores after API process restart"], cwd=FRONT, env=test_env, check=True)
        process.terminate()
        process.wait(timeout=10)
        process = start()
        print("Restarted actual API process without touching database.", flush=True)
        subprocess.run([node, str(cli), "test", "--grep", "restores after API process restart"], cwd=FRONT, env=test_env, check=True)
        with engine.connect() as connection:
            assert connection.execute(text("SELECT DISTINCT source_type FROM import_batch")).scalars().all() == ["SYNTHETIC"]
            print("Test database approval states:", connection.execute(text("SELECT entity, status, count(*) FROM import_batch GROUP BY entity,status ORDER BY entity,status")).all())
    finally:
        if frontend is not None and frontend.poll() is None:
            frontend.terminate()
            frontend.wait(timeout=10)
        if process is not None and process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        log.close()
        front_log.close()
        engine.dispose()


if __name__ == "__main__":
    main()
