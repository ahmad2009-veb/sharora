"""Migration 0003 on a database with the old layout (lettered blocks, floors -1…10, 8 per floor)."""

import os
import subprocess
import sys
from pathlib import Path

import sqlalchemy as sa

ROOT = Path(__file__).resolve().parent.parent


def alembic(url: str, *args: str) -> str:
    env = {**os.environ, "DATABASE_URL": url}
    res = subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return res.stdout


def old_layout(conn: sa.Connection) -> None:
    unit_id = 0
    for b, letter in enumerate("АБВ", start=1):
        conn.execute(
            sa.text("INSERT INTO blocks (id, letter, name, sort_order) VALUES (:i, :l, :n, :o)"),
            {"i": b, "l": letter, "n": f"Блок {letter}", "o": b - 1},
        )
        for number in [-1, *range(1, 11)]:
            floor_id = b * 100 + number + 1
            commercial = number < 2
            conn.execute(
                sa.text(
                    "INSERT INTO floors (id, block_id, label, number, kind) "
                    "VALUES (:i, :b, :l, :n, :k)"
                ),
                {
                    "i": floor_id,
                    "b": b,
                    "l": f"Этаж {number}",
                    "n": number,
                    "k": "commercial" if commercial else "residential",
                },
            )
            for apt in [1] if commercial else range(1, 9):
                unit_id += 1
                conn.execute(
                    sa.text(
                        "INSERT INTO units (id, floor_id, name, number, kind, area, status) "
                        "VALUES (:i, :f, :n, :a, :k, 50, 'sold')"
                    ),
                    {
                        "i": unit_id,
                        "f": floor_id,
                        "n": f"Хонаи {apt}",
                        "a": apt,
                        "k": "commercial" if commercial else "apartment",
                    },
                )


def unit_id(conn: sa.Connection, letter: str, floor: int, number: int) -> int:
    return conn.execute(
        sa.text(
            "SELECT u.id FROM units u JOIN floors f ON f.id = u.floor_id "
            "JOIN blocks b ON b.id = f.block_id "
            "WHERE b.letter = :l AND f.number = :f AND u.number = :n"
        ),
        {"l": letter, "f": floor, "n": number},
    ).scalar_one()


def test_restructure_keeps_leads_and_sales(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'old.db'}"
    alembic(url, "upgrade", "0002")
    engine = sa.create_engine(url)
    with engine.begin() as conn:
        old_layout(conn)
        kept = unit_id(conn, "Б", 3, 2)
        gone = unit_id(conn, "А", 2, 8)
        conn.execute(
            sa.text("INSERT INTO leads (name, phone, unit_id, processed) VALUES (:n, '1', :u, 0)"),
            [{"n": "kept", "u": kept}, {"n": "gone", "u": gone}],
        )
        conn.execute(
            sa.text(
                "INSERT INTO sales (unit_id, buyer_name, buyer_phone, amount_paid, sale_date, "
                "is_archived) VALUES (:u, :n, '1', 1, '2026-10-19', 0)"
            ),
            [{"u": kept, "n": "kept"}, {"u": gone, "n": "gone"}],
        )

    out = alembic(url, "upgrade", "head")
    assert "lead #2 (gone) unlinked from Блок А · Этаж 2 · Хонаи 8" in out

    with engine.connect() as conn:
        blocks = conn.execute(sa.text("SELECT letter, name FROM blocks ORDER BY sort_order")).all()
        assert [tuple(b) for b in blocks] == [("1", "Блок 1"), ("2", "Блок 2")]
        per_floor = conn.execute(
            sa.text(
                "SELECT b.letter, f.number, f.kind, count(u.id), min(u.area), max(u.area) "
                "FROM floors f JOIN blocks b ON b.id = f.block_id "
                "JOIN units u ON u.floor_id = f.id GROUP BY f.id ORDER BY b.letter, f.number"
            )
        ).all()
        assert [(r[0], r[1]) for r in per_floor] == [(b, n) for b in "12" for n in range(1, 10)]
        assert {(r[2], r[3]) for r in per_floor if r[1] == 1} == {("commercial", 1)}
        assert {(r[2], r[3], r[4], r[5]) for r in per_floor if r[1] > 1} == {
            ("residential", 7, 42, 103)
        }

        # Б → Блок 2: the unit keeps its id, links and the only active sale → sold.
        assert unit_id(conn, "2", 3, 2) == kept
        statuses = conn.execute(sa.text("SELECT id, status FROM units WHERE status != 'free'"))
        assert [tuple(r) for r in statuses] == [(kept, "sold")]
        leads = conn.execute(sa.text("SELECT name, unit_id, message FROM leads ORDER BY id")).all()
        assert [tuple(r) for r in leads] == [
            ("kept", kept, None),
            ("gone", None, "[Было: Блок А · Этаж 2 · Хонаи 8]"),
        ]
        sale = conn.execute(sa.text("SELECT unit_id, comment FROM sales WHERE buyer_name = 'gone'"))
        assert tuple(sale.one()) == (None, "[Было: Блок А · Этаж 2 · Хонаи 8]")


def test_restructure_skips_an_empty_database(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'empty.db'}"
    alembic(url, "upgrade", "head")
    with sa.create_engine(url).connect() as conn:
        assert conn.execute(sa.text("SELECT count(*) FROM blocks")).scalar_one() == 0
