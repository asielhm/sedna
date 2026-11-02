# Sedna · Carga de calificaciones

Web app in Spanish adapting the provided Tkinter/Selenium workflow. Supports cuatrimestrales and all six rendimiento periods, Excel templates, workbook validation and preview, and explicit confirmation before submission.

## Run locally

Requires Python 3.12+, Chromium/Chrome and a compatible ChromeDriver (on PATH, or downloadable by Selenium Manager).

```sh
git clone https://github.com/asielhm/sedna.git
cd sedna
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

The development server listens on port 5000 on the local machine. Run `.venv/bin/python -m pytest -q` for tests.

## Excel workflow

1. Choose the mode and period, then download its template.
2. Fill in `Alumno` exactly as displayed in Sedna. Duplicate the sheet for each class. **Sheet order must match Sedna's class dropdown, including its first option**, as in the original desktop script. Sheet names are labels, not class identifiers.
3. Cuatrimestrales requires integer `Nota`. Rendimientos requires the six competency columns. `Logros Académicos` is 1–4 and maps to Sedna's value `5 - mark`; it is omitted for final preliminary valuation. Other marks are checked against Sedna's available dropdown values.
4. Preview the workbook. After preview, reselect the same workbook, enter credentials and confirm to upload.
5. Check the result and saved marks directly in Sedna. Submission is reported as sent, not independently verified persistence. There is no automatic retry or rollback. An error stops subsequent classes; earlier classes may have been saved.

Credentials and Excel uploads are processed in memory, never intentionally persisted. No real credentials or student data are included. A live account is required to verify Sedna's current selectors and persistence. The adapter uses exact student names to avoid the original script's ambiguous substring matches.

## Hosting

This is a local development application. Before exposing it to a network, add application access control and HTTPS, use a production WSGI server with an appropriate long request timeout, configure a stable `APP_SECRET_KEY`, and use secure session cookies. Uploads are synchronous and the browser must remain on the page. Set `CHROME_BINARY` when Chrome is not discoverable. Do not enable Flask debug mode for real credentials. Sedna access requires HTTPS to `sedna.sanandres.esc.edu.ar`; Selenium Manager may require ChromeDriver download domains if no driver is installed.

## Compatibility with supplied Excel files

Validated both user-provided formats: `CuatrimestralesAHM.xlsx` and `Segunda valoración preliminarAHM.xlsx`, each with eight sheets and 182 student records. Both parse without modification. Competency values of zero are preserved and submitted as zero, subject to the options available in Sedna. Formatted but empty trailing rows are ignored. Downloadable templates already use the same column names and order. The original files, student names and actual marks are not included in the source or test fixtures.

## GitHub and website hosting

The repository contains the complete website: `app.py` serves the backend, `templates/index.html` is the page, and `static/` contains its CSS and JavaScript. GitHub Actions runs the test suite for pushes and pull requests.

GitHub Pages supports static sites and cannot run this Python/Selenium application or connect it to Sedna. To use the complete app, run it locally with the commands above, or deploy it to a Python-capable server with Chrome/Chromium and ChromeDriver. See the hosting requirements above before making it publicly accessible. No live Sedna upload has been verified yet.
