import os
import secrets
from io import BytesIO
from flask import Flask, render_template, request, session, send_file, abort
from werkzeug.exceptions import RequestEntityTooLarge
from workbook import PERIODS, parse, template
from sedna import upload

app = Flask(__name__)
app.secret_key = os.environ.get('APP_SECRET_KEY') or secrets.token_hex(32)
app.config.update(MAX_CONTENT_LENGTH=5 * 1024 * 1024, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Strict')

@app.before_request
def csrf():
    if 'csrf' not in session:
        session['csrf'] = secrets.token_urlsafe(32)
    if request.method == 'POST' and not secrets.compare_digest(session['csrf'], request.form.get('csrf', '')):
        abort(400)

@app.after_request
def headers(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'"
    return response

@app.route('/', methods=['GET', 'POST'])
def index():
    mode = request.form.get('mode', 'cuatrimestrales')
    period = request.form.get('period', PERIODS['cuatrimestrales'][0])
    context = dict(periods=PERIODS, mode=mode, period=period)
    if request.method == 'POST':
        try:
            file = request.files.get('workbook')
            if not file or not file.filename.lower().endswith('.xlsx'):
                raise ValueError('Seleccione un archivo .xlsx.')
            data = file.read()
            classes = parse(data, mode, period)
            context['classes'] = classes
            if request.form.get('action') == 'upload':
                if request.form.get('confirm') != 'yes':
                    raise ValueError('Confirme el período y el orden de las clases antes de cargar.')
                username, password = request.form.get('username', '').strip(), request.form.get('password', '')
                if not username or not password:
                    raise ValueError('Ingrese usuario y contraseña de Sedna.')
                context['results'] = upload(classes, mode, period, username, password)
        except ValueError as exc:
            context['error'] = str(exc)
        except Exception:
            context['error'] = 'No se pudo completar la operación. Compruebe la conexión y sus credenciales. Si inició una carga, revise Sedna antes de reintentar.'
    return render_template('index.html', **context)

@app.get('/template')
def download_template():
    mode, period = request.args.get('mode'), request.args.get('period')
    if mode not in PERIODS or period not in PERIODS[mode]:
        abort(400)
    return send_file(template(mode, period), download_name=f'sedna-{mode}.xlsx', as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.errorhandler(RequestEntityTooLarge)
def too_large(error):
    return 'El archivo supera el límite de 5 MB.', 413

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
