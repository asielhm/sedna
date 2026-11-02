from io import BytesIO
from zipfile import ZipFile, BadZipFile
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

COMPETENCIES = ['Colaboración', 'Creatividad', 'Pens.Crítico', 'Comunicación', 'Carácter', 'Ciudadanía']
PERIODS = {
    'cuatrimestrales': ['Primer cuatrimestre', 'Segundo cuatrimestre'],
    'rendimientos': ['PRIMERA VALORACIÓN PRELIMINAR', 'SEGUNDA VALORACIÓN PRELIMINAR', 'VALORACION PRELIMINAR FINAL', 'Segundo Rendimiento', 'Tercer Rendimiento', 'Cuarto Rendimiento'],
}

def columns(mode, period):
    return ['Alumno', 'Nota'] if mode == 'cuatrimestrales' else ['Alumno'] + ([] if period == 'VALORACION PRELIMINAR FINAL' else ['Logros Académicos']) + COMPETENCIES

def parse(data, mode, period):
    if mode not in PERIODS or period not in PERIODS[mode]:
        raise ValueError('Seleccione un período válido.')
    try:
        with ZipFile(BytesIO(data)) as archive:
            if sum(i.file_size for i in archive.infolist()) > 30_000_000:
                raise ValueError('El Excel descomprimido supera 30 MB.')
        book = load_workbook(BytesIO(data), read_only=True, data_only=False)
    except (BadZipFile, OSError, KeyError) as exc:
        raise ValueError('El archivo no es un Excel .xlsx válido.') from exc
    result = []
    total = 0
    try:
        if len(book.sheetnames) > 100:
            raise ValueError('Máximo 100 clases por archivo.')
        for sheet in book:
            iterator = sheet.iter_rows(values_only=True)
            headers = [str(v).strip() if v is not None else '' for v in next(iterator, ())]
            required = columns(mode, period)
            if len(set(headers)) != len(headers) or any(c not in headers for c in required):
                raise ValueError(f'{sheet.title}: encabezados requeridos: {", ".join(required)}.')
            students = []
            seen = set()
            for number, values in enumerate(iterator, 2):
                total += 1
                if total > 10000:
                    raise ValueError('Máximo 10.000 filas por archivo.')
                if all(v is None for v in values):
                    continue
                row = dict(zip(headers, values))
                name = str(row.get('Alumno') or '').strip()
                if not name or name.startswith('=') or name in seen:
                    raise ValueError(f'{sheet.title}, fila {number}: alumno vacío, fórmula o duplicado.')
                seen.add(name)
                record = {'Alumno': name}
                for key in required[1:]:
                    value = row.get(key)
                    try:
                        numeric = float(value)
                        if isinstance(value, bool) or not numeric.is_integer():
                            raise ValueError()
                        record[key] = int(numeric)
                    except (ValueError, TypeError, OverflowError):
                        raise ValueError(f'{sheet.title}, fila {number}: {key} debe ser un entero.')
                    if key == 'Logros Académicos' and not 1 <= record[key] <= 4:
                        raise ValueError(f'{sheet.title}, fila {number}: Logros Académicos debe ser 1–4.')
                students.append(record)
            if not students:
                raise ValueError(f'{sheet.title}: la hoja no contiene alumnos.')
            result.append({'name': sheet.title, 'students': students})
    finally:
        book.close()
    return result

def template(mode, period):
    book = Workbook()
    sheet = book.active
    sheet.title = 'Clase 1'
    sheet.append(columns(mode, period))
    for cell in sheet[1]:
        cell.font = Font(color='FFFFFF', bold=True)
        cell.fill = PatternFill('solid', fgColor='164E63')
        sheet.column_dimensions[cell.column_letter].width = max(24, len(cell.value) + 3)
    sheet.freeze_panes = 'B2'
    output = BytesIO()
    book.save(output)
    output.seek(0)
    return output
