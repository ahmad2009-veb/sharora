import os
import random
from collections.abc import Iterator

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-only-jwt-secret-0123456789abcdef"
os.environ["DEFAULT_ADMIN_USERNAME"] = "admin"
os.environ["DEFAULT_ADMIN_PASSWORD"] = "test-password"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core import database

# One shared in-memory database for the app, its lifespan hook and the tests.
database.engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
database.SessionLocal.configure(bind=database.engine)

from app.core import security_log  # noqa: E402
from app.core.rate_limit import counter, limiter  # noqa: E402
from app.main import app  # noqa: E402
from seed import seed  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db() -> Iterator[None]:
    database.Base.metadata.drop_all(database.engine)
    database.Base.metadata.create_all(database.engine)
    with database.SessionLocal() as db:
        seed(db, random.Random(1))
    limiter.reset()
    counter.reset()
    security_log.reset()
    yield


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_client(client: TestClient) -> TestClient:
    res = client.post("/api/admin/login", json={"username": "admin", "password": "test-password"})
    assert res.status_code == 200
    return client
