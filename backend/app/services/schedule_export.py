"""«График платежей» as .xlsx (openpyxl) and .docx (python-docx).

Both are built from ScheduleOut, the same data the admin sees on screen.
"""

import io
import re
from datetime import date

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.schemas.sale import SaleOut, ScheduleOut
from app.services.installments import today_tj

COMPANY = "Zarafshon Sokhtmon"
TITLE = "График платежей по договору рассрочки"
STATUS_LABELS = {"pending": "Ожидается", "paid": "Оплачено", "overdue": "Просрочено"}
HEADERS = (
    "№",
    "Дата платежа",
    "Сумма платежа",
    "Оплачено",
    "Остаток долга после платежа",
    "Статус",
)

# Russian + Tajik Cyrillic → Latin for file names (Content-Disposition stays ASCII).
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "ғ": "gh", "д": "d", "е": "e", "ё": "yo",
    "ж": "zh", "з": "z", "и": "i", "ӣ": "i", "й": "y", "к": "k", "қ": "q", "л": "l",
    "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ӯ": "u", "ф": "f", "х": "kh", "ҳ": "h", "ц": "ts", "ч": "ch", "ҷ": "j", "ш": "sh",
    "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}  # fmt: skip


def translit(text: str) -> str:
    out = []
    for ch in text:
        lat = _TRANSLIT.get(ch.lower(), ch)
        out.append(lat.capitalize() if ch.isupper() else lat)
    return re.sub(r"[^A-Za-z0-9]+", "", "".join(out))


def export_filename(sale: SaleOut, ext: str) -> str:
    """grafik_Blok1_Etazh3_Khonai5_Rahmonov.xlsx"""
    surname = translit(sale.buyer_name.split()[0]) if sale.buyer_name.split() else ""
    parts = ["grafik"]
    if sale.block_letter is not None:
        parts.append(f"Blok{translit(sale.block_letter)}")
    if sale.floor_number is not None:
        parts.append(f"Etazh{sale.floor_number}")
    if sale.unit_name:
        parts.append(translit(sale.unit_name))
    parts.append(surname or f"sale{sale.id}")
    return "_".join(p for p in parts if p) + f".{ext}"


def _money(value: float | None) -> str:
    return "—" if value is None else f"{value:,.0f}".replace(",", " ") + " смн"


def _date(value: date | None) -> str:
    return value.strftime("%d.%m.%Y") if value else "—"


def _months(n: int) -> str:
    last2, last = n % 100, n % 10
    word = (
        "месяц"
        if last == 1 and last2 != 11
        else "месяца"
        if 2 <= last <= 4 and not 12 <= last2 <= 14
        else "месяцев"
    )
    return f"{n} {word}"


def apartment_label(sale: SaleOut) -> str:
    if sale.unit_name is None:
        return "Помещение удалено"
    parts = [f"Блок {sale.block_letter}", f"Этаж {sale.floor_number}", sale.unit_name]
    return ", ".join(parts)


def summary_rows(sale: SaleOut) -> list[tuple[str, str]]:
    rest = sale.total_price - sale.down_payment if sale.total_price is not None else None
    rows = [
        ("Покупатель", sale.buyer_name),
        ("Телефон", _phone(sale.buyer_phone)),
        ("Квартира", apartment_label(sale)),
        ("Площадь", f"{sale.area:g} м²".replace(".", ",") if sale.area else "—"),
        ("Дата продажи", _date(sale.sale_date)),
        ("Общая стоимость", _money(sale.total_price)),
        ("Первоначальный взнос", _money(sale.down_payment)),
        ("Остаток", _money(rest)),
    ]
    if sale.payment_type == "installment":
        if sale.markup_percent:
            rows.append(("Наценка за рассрочку", f"{sale.markup_percent:g}%".replace(".", ",")))
            rows.append(("Сумма рассрочки с наценкой", _money(sale.financed_amount)))
        rows += [
            ("Срок рассрочки", _months(sale.term_months or 0)),
            ("Ежемесячный платёж", _money(sale.monthly_payment)),
            ("Остаток долга на сегодня", _money(sale.remaining)),
        ]
    else:
        rows.append(("Способ оплаты", "Полная оплата"))
    return rows


def _phone(value: str) -> str:
    m = re.fullmatch(r"\+992(\d{2})(\d{3})(\d{4})", value)
    return f"+992 {m[1]} {m[2]} {m[3]}" if m else value


# ---------- Excel ----------


def schedule_xlsx(schedule: ScheduleOut) -> bytes:
    sale = schedule.sale
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "График платежей"

    thin = Side(style="thin", color="000000")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    money = '#,##0 "смн"'
    widths = (6, 16, 18, 18, 26, 16)
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    last_col = get_column_letter(len(widths))

    def merged(row: int, text: str, font: Font, height: float | None = None) -> None:
        ws.merge_cells(f"A{row}:{last_col}{row}")
        cell = ws.cell(row=row, column=1, value=text)
        cell.font = font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        if height:
            ws.row_dimensions[row].height = height

    merged(1, COMPANY, Font(size=16, bold=True), 26)
    merged(2, TITLE, Font(size=13, bold=True), 20)
    merged(3, f"Дата формирования: {_date(today_tj())}", Font(size=10, italic=True))

    row = 5
    for label, value in summary_rows(sale):
        ws.merge_cells(f"A{row}:B{row}")
        ws.merge_cells(f"C{row}:{last_col}{row}")
        ws.cell(row=row, column=1, value=label).font = Font(bold=True)
        ws.cell(row=row, column=3, value=value)
        row += 1

    row += 1
    header_row = row
    for col, title in enumerate(HEADERS, start=1):
        cell = ws.cell(row=row, column=col, value=title)
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="E7E9EE")
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 30

    for p in schedule.payments:
        row += 1
        values = (
            p.number,
            p.due_date,
            p.amount,
            p.paid_amount,
            p.balance_after,
            STATUS_LABELS[p.status],
        )
        for col, item in enumerate(values, start=1):
            cell = ws.cell(row=row, column=col, value=item)
            cell.border = border
            if col == 1:
                cell.alignment = Alignment(horizontal="center")
            elif col == 2:
                cell.number_format = "DD.MM.YYYY"
                cell.alignment = Alignment(horizontal="center")
            elif col in (3, 4, 5):
                cell.number_format = money
            elif p.status == "overdue":
                cell.font = Font(bold=True, color="B91C1C")

    if schedule.payments:
        row += 1
        totals = (
            "Итого",
            None,
            sum(p.amount for p in schedule.payments),
            sum(p.paid_amount for p in schedule.payments),
            None,
            None,
        )
        ws.merge_cells(f"A{row}:B{row}")
        for col, total in enumerate(totals, start=1):
            cell = ws.cell(row=row, column=col, value=total)
            cell.font = Font(bold=True)
            cell.border = border
            cell.fill = PatternFill("solid", fgColor="E7E9EE")
            if col in (3, 4):
                cell.number_format = money
    else:
        row += 1
        ws.merge_cells(f"A{row}:{last_col}{row}")
        ws.cell(row=row, column=1, value="Квартира оплачена полностью — графика платежей нет.")

    row += 3
    ws.cell(row=row, column=1, value="Продавец ______________")
    ws.cell(row=row, column=4, value="Покупатель ______________")

    ws.print_title_rows = f"{header_row}:{header_row}"
    ws.print_area = f"A1:{last_col}{row}"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    ws.page_margins.left = ws.page_margins.right = 0.5
    ws.page_margins.top = ws.page_margins.bottom = 0.6
    ws.oddFooter.center.text = "Страница &P из &N"
    ws.freeze_panes = ws.cell(row=header_row + 1, column=1)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------- Word ----------


def schedule_docx(schedule: ScheduleOut) -> bytes:
    sale = schedule.sale
    doc = Document()
    section = doc.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    for side in ("left_margin", "right_margin"):
        setattr(section, side, Cm(2))
    section.top_margin = section.bottom_margin = Cm(1.8)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(11)

    company = doc.add_paragraph()
    company.alignment = WD_ALIGN_PARAGRAPH.CENTER
    company_run = company.add_run(COMPANY)
    company_run.bold = True
    company_run.font.size = Pt(14)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.add_run(TITLE)
    title_run.bold = True
    title_run.font.size = Pt(13)

    when = doc.add_paragraph(f"Дата: {_date(today_tj())}")
    when.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    summary = doc.add_table(rows=0, cols=2)
    for label, value in summary_rows(sale):
        cells = summary.add_row().cells
        cells[0].text = label
        cells[0].paragraphs[0].runs[0].bold = True
        cells[1].text = value
    for r in summary.rows:
        r.cells[0].width, r.cells[1].width = Cm(6.5), Cm(10.5)

    doc.add_paragraph()
    if schedule.payments:
        table = doc.add_table(rows=1, cols=len(HEADERS))
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for cell, text in zip(table.rows[0].cells, HEADERS, strict=True):
            cell.text = text
            para = cell.paragraphs[0]
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            para.runs[0].bold = True
            para.runs[0].font.size = Pt(10)
        for p in schedule.payments:
            values = (
                str(p.number),
                _date(p.due_date),
                _money(p.amount),
                _money(p.paid_amount) if p.paid_amount else "—",
                _money(p.balance_after),
                STATUS_LABELS[p.status],
            )
            _add_row(table, values, bold=False)
        _add_row(
            table,
            (
                "",
                "Итого",
                _money(sum(p.amount for p in schedule.payments)),
                _money(sum(p.paid_amount for p in schedule.payments)),
                "",
                "",
            ),
            bold=True,
        )
        widths = (Cm(1), Cm(2.6), Cm(3.1), Cm(3.1), Cm(4), Cm(3.2))
        for r in table.rows:
            for cell, w in zip(r.cells, widths, strict=True):
                cell.width = w
    else:
        doc.add_paragraph("Квартира оплачена полностью — графика платежей нет.")

    doc.add_paragraph()
    doc.add_paragraph()
    signs = doc.add_table(rows=2, cols=2)
    signs.cell(0, 0).text = "Продавец ______________"
    signs.cell(0, 1).text = "Покупатель ______________"
    signs.cell(1, 0).text = COMPANY
    signs.cell(1, 1).text = sale.buyer_name
    for cell in (signs.cell(1, 0), signs.cell(1, 1)):
        cell.paragraphs[0].runs[0].font.size = Pt(9)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _add_row(table, values: tuple[str, ...], *, bold: bool) -> None:
    cells = table.add_row().cells
    for i, (cell, text) in enumerate(zip(cells, values, strict=True)):
        cell.text = text
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER if i in (0, 1, 5) else WD_ALIGN_PARAGRAPH.RIGHT
        if para.runs:
            para.runs[0].bold = bold
            para.runs[0].font.size = Pt(10)
