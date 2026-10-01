#!/usr/bin/env python3
"""Generate local DPT JSON from a Word DOCX voter table."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

DEFAULT_INPUT = Path('/Users/s_idrive/Downloads/Daftar_Pemilih_TPS_004.docx')
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / 'src' / 'data' / 'dpt-tps-004.json'
EXPECTED_HEADERS = ['NO', 'TPS', 'NAMA PEMILIH', 'JK', 'STATUS', 'DUSUN/ALAMAT', 'RT']
EXPECTED_ROW_COUNT = 600
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def cell_text(cell: ElementTree.Element) -> str:
    parts = [node.text or '' for node in cell.findall('.//w:t', NS)]
    return ' '.join(''.join(parts).split())


def read_table_rows(docx_path: Path) -> list[list[str]]:
    with zipfile.ZipFile(docx_path) as archive:
        try:
            xml_bytes = archive.read('word/document.xml')
        except KeyError as exc:
            raise ValueError('DOCX tidak memiliki word/document.xml') from exc

    root = ElementTree.fromstring(xml_bytes)
    rows: list[list[str]] = []
    for row in root.findall('.//w:tr', NS):
        values = [cell_text(cell) for cell in row.findall('./w:tc', NS)]
        if any(values):
            rows.append(values)
    return rows


def normalize_rows(rows: list[list[str]]) -> list[dict[str, object]]:
    if not rows:
        raise ValueError('Tidak ada baris tabel yang ditemukan di DOCX')

    header = rows[0]
    if header != EXPECTED_HEADERS:
        raise ValueError(f'Header DOCX tidak sesuai. Ditemukan {header!r}, diharapkan {EXPECTED_HEADERS!r}')

    voters: list[dict[str, object]] = []
    seen_numbers: set[int] = set()
    for index, row in enumerate(rows[1:], start=2):
        if len(row) != len(EXPECTED_HEADERS):
            raise ValueError(f'Baris tabel ke-{index} punya {len(row)} kolom, diharapkan {len(EXPECTED_HEADERS)}: {row!r}')

        no_raw, tps, nama, jk, status, alamat, rt = [value.strip() for value in row]
        if not no_raw.isdigit():
            raise ValueError(f'NO pada baris tabel ke-{index} bukan angka: {no_raw!r}')
        no_urut = int(no_raw)
        if no_urut in seen_numbers:
            raise ValueError(f'NO duplikat ditemukan: {no_urut}')
        seen_numbers.add(no_urut)

        required = {
            'TPS': tps,
            'NAMA PEMILIH': nama,
            'JK': jk,
            'DUSUN/ALAMAT': alamat,
            'RT': rt,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise ValueError(f'Baris NO {no_urut} memiliki field kosong: {", ".join(missing)}')

        voters.append({
            'no_urut': no_urut,
            'tps': tps,
            'nama': nama,
            'jenis_kelamin': jk,
            'status_pemilih': status,
            'alamat': alamat,
            'rt': rt,
        })

    if len(voters) != EXPECTED_ROW_COUNT:
        raise ValueError(f'Jumlah pemilih {len(voters)}, diharapkan {EXPECTED_ROW_COUNT}')

    return voters


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate local DPT JSON from a DOCX table.')
    parser.add_argument('input', nargs='?', type=Path, default=DEFAULT_INPUT, help=f'DOCX input path (default: {DEFAULT_INPUT})')
    parser.add_argument('output', nargs='?', type=Path, default=DEFAULT_OUTPUT, help=f'JSON output path (default: {DEFAULT_OUTPUT})')
    args = parser.parse_args()

    rows = read_table_rows(args.input)
    voters = normalize_rows(rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(voters, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(voters)} voters to {args.output}')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise SystemExit(1)
