from io import BytesIO
import pytest
from openpyxl import load_workbook
from app import app
from workbook import parse, template, PERIODS, COMPETENCIES

def filled(mode='cuatrimestrales', period='Primer cuatrimestre', values=None):
    book = load_workbook(template(mode, period))
    book.active.append(values or ['Alumno de prueba', 8])
    out = BytesIO(); book.save(out)
    return out.getvalue()

def test_template_and_parse():
    result = parse(filled(), 'cuatrimestrales', 'Primer cuatrimestre')
    assert result[0]['students'] == [{'Alumno': 'Alumno de prueba', 'Nota': 8}]

def test_rendimientos_final():
    period = 'VALORACION PRELIMINAR FINAL'
    result = parse(filled('rendimientos', period, ['Alumno', 1, 2, 3, 4, 1, 2]), 'rendimientos', period)
    assert 'Logros Académicos' not in result[0]['students'][0]
    assert all(c in result[0]['students'][0] for c in COMPETENCIES)

@pytest.mark.parametrize('values', [['Alumno', 4.5], ['Alumno', '=1+2'], ['', 8]])
def test_invalid_marks(values):
    with pytest.raises(ValueError):
        parse(filled(values=values), 'cuatrimestrales', 'Primer cuatrimestre')

def test_routes_and_csrf():
    client = app.test_client()
    assert client.get('/').status_code == 200
    assert client.post('/').status_code == 400
    with client.session_transaction() as session:
        token = session['csrf']
    response = client.post('/', data={'csrf':token, 'mode':'cuatrimestrales', 'period':'Primer cuatrimestre', 'action':'preview', 'workbook':(BytesIO(filled()), 'marks.xlsx')})
    assert b'Alumno de prueba' in response.data
    response = client.get('/template?mode=cuatrimestrales&period=Primer+cuatrimestre')
    assert response.status_code == 200
    assert load_workbook(BytesIO(response.data)).active['B1'].value == 'Nota'

def test_upload_requires_confirmation(monkeypatch):
    def forbidden(*args):
        pytest.fail('Upload must not run without confirmation')
    monkeypatch.setattr('app.upload', forbidden)
    client = app.test_client(); client.get('/')
    with client.session_transaction() as session:
        token = session['csrf']
    response = client.post('/', data={'csrf':token, 'mode':'cuatrimestrales', 'period':'Primer cuatrimestre', 'action':'upload', 'workbook':(BytesIO(filled()), 'marks.xlsx')})
    assert 'Confirme' in response.text

def test_preliminary_template_preserves_zero_competencies():
    period = 'SEGUNDA VALORACIÓN PRELIMINAR'
    values = ['Alumno de prueba', 4, 3, 0, 2, 0, 0, 0]
    result = parse(filled('rendimientos', period, values), 'rendimientos', period)
    student = result[0]['students'][0]
    assert list(student) == ['Alumno', 'Logros Académicos', *COMPETENCIES]
    assert student['Logros Académicos'] == 4
    assert [student[c] for c in COMPETENCIES] == [3, 0, 2, 0, 0, 0]


def test_multiple_class_sheets_keep_order_and_ignore_formatted_empty_rows():
    book = load_workbook(template('cuatrimestrales', 'Primer cuatrimestre'))
    first = book.active
    first.title = 'Clase A'
    first.append(['Alumno A', 10])
    # Excel templates may retain formatting beyond the last populated row.
    first['A25'].number_format = '@'
    second = book.create_sheet('Clase B')
    second.append(['Alumno', 'Nota'])
    second.append(['Alumno B', 7])
    output = BytesIO()
    book.save(output)
    result = parse(output.getvalue(), 'cuatrimestrales', 'Primer cuatrimestre')
    assert [group['name'] for group in result] == ['Clase A', 'Clase B']
    assert [len(group['students']) for group in result] == [1, 1]
