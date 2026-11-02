"""Sedna browser adapter, following the supplied desktop application's selectors."""
import os
import time
import unicodedata
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from workbook import COMPETENCIES


def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.casefold()) if not unicodedata.combining(c)).strip()


def select_text(element, text):
    select = Select(element)
    matches = [o for o in select.options if normalized(o.text) == normalized(text)]
    if len(matches) != 1:
        raise ValueError('No se encontró una opción única para el período.')
    select.select_by_value(matches[0].get_attribute('value'))


def upload(classes, mode, period, username, password):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--disable-dev-shm-usage')
    if os.environ.get('CHROME_BINARY'):
        options.binary_location = os.environ['CHROME_BINARY']
    driver = webdriver.Chrome(options=options)
    results = []
    try:
        wait = WebDriverWait(driver, 20)
        driver.get('https://sedna.sanandres.esc.edu.ar/pages/login.aspx')
        wait.until(EC.presence_of_element_located((By.NAME, 'txtcodigo'))).send_keys(username)
        driver.find_element(By.NAME, 'txtclave').send_keys(password, Keys.RETURN)
        menu = wait.until(EC.visibility_of_element_located((By.XPATH, "//a[contains(text(), 'Calificaciones')]")))
        ActionChains(driver).move_to_element(menu).perform()
        label = 'Secundaria - Ingreso de ' + ('Cuatrimestrales' if mode == 'cuatrimestrales' else 'Rendimientos')
        wait.until(EC.element_to_be_clickable((By.PARTIAL_LINK_TEXT, label))).click()
        period_id = 'ContentPlaceHolder1_' + ('CmbPeriodo' if mode == 'cuatrimestrales' else 'CmbRendimiento')
        select_text(wait.until(EC.element_to_be_clickable((By.ID, period_id))), period)
        time.sleep(1)
        for index, group in enumerate(classes):
            submitted = False
            try:
                dropdown = wait.until(EC.element_to_be_clickable((By.NAME, 'ctl00$ContentPlaceHolder1$CmbOpcion')))
                choice = Select(dropdown)
                if index >= len(choice.options):
                    raise ValueError('No existe esta posición de clase en Sedna.')
                class_label = choice.options[index].text
                choice.select_by_index(index)
                time.sleep(1)
                # Preflight every student and dropdown before changing any field in this class.
                changes = []
                for student in group['students']:
                    matches = [e for e in driver.find_elements(By.CSS_SELECTOR, 'span[id]') if ' '.join(e.text.split()) == ' '.join(student['Alumno'].split())]
                    if len(matches) != 1:
                        raise ValueError(f"Alumno no encontrado de forma única: {student['Alumno']}")
                    sid = matches[0].get_attribute('id').split('_')[-1]
                    fields = [('cmbNota', student['Nota'])] if mode == 'cuatrimestrales' else [(f'cmb{i}', student[c]) for i, c in enumerate(COMPETENCIES, 1)]
                    if mode == 'rendimientos' and 'Logros Académicos' in student:
                        fields.append(('cmbacademicas', 5 - student['Logros Académicos']))
                    for field, value in fields:
                        element = Select(driver.find_element(By.ID, f'ContentPlaceHolder1_{field}_{sid}'))
                        if str(value) not in [o.get_attribute('value') for o in element.options]:
                            raise ValueError(f"Valor no disponible para {student['Alumno']}: {value}")
                        changes.append((element, str(value)))
                for element, value in changes:
                    element.select_by_value(value)
                driver.find_element(By.ID, 'ContentPlaceHolder1_btnaceptar').click()
                submitted = True
                try:
                    WebDriverWait(driver, 5).until(EC.alert_is_present()).accept()
                except TimeoutException:
                    pass
                time.sleep(1)
                results.append({'class': group['name'], 'status': f'Enviado a {class_label}. Verifique las notas guardadas en Sedna.'})
            except Exception as exc:
                reason = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
                results.append({'class': group['name'], 'status': ('Guardado incierto; compruebe Sedna antes de reintentar. ' if submitted else 'Carga detenida. ') + reason})
                break
    finally:
        driver.quit()
    return results
