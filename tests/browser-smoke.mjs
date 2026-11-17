import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const env = { ...process.env, ALLOWED_ORIGIN: 'http://localhost:5173', VITE_API_PORT: '3001' };
const children = [], errors = []; let browser, page, logs = '';
const out = process.env.SMOKE_SCREENSHOTS || '/tmp/mgimo-smoke';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function start(args) { const child = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] }); for (const stream of [child.stdout, child.stderr]) stream.on('data', d => logs += d); children.push(child); }
async function ready(url) { for (let i = 0; i < 100; i++) { try { await fetch(url); return; } catch { await pause(100); } } throw new Error('Server did not start: ' + logs); }
try {
  await mkdir(out, { recursive: true });
  start(['--import', 'tsx', 'server/dev-proxy.ts']); start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  await Promise.all([ready('http://localhost:5173'), ready('http://localhost:3001/api/auth')]);
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined, args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : [] });
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const nav = () => page.getByRole('navigation');
  const api = async (path, data, ctx = context) => { const r = data ? await ctx.request.post('http://localhost:5173' + path, { data }) : await ctx.request.get('http://localhost:5173' + path); const body = await r.json(); return { status: r.status(), ...body }; };
  async function noOverflow(label) { await pause(350); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow: ' + label); }
  async function login(email, password) { await page.locator('#login').fill(email); await page.locator('#password').fill(password); await page.getByRole('button', { name: 'Войти в кабинет', exact: true }).click(); await page.getByRole('heading', { name: 'Что требует внимания', exact: true }).waitFor(); }
  async function closeDialog() { await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); }
  await page.goto('http://localhost:5173'); await login('d.sokolov@my.mgimo.ru', 'debt1234');
  const owner = (await api('/api/student')).account.id;
  await api('/api/student', { action: 'reset_demo', ownerId: owner }); await page.reload(); await page.getByRole('heading', { name: 'Что требует внимания' }).waitFor();
  assert.equal(await page.getByRole('tab', { name: 'Деканат', exact: true }).count(), 0);
  await page.screenshot({ path: out + '/dashboard-clean-360.png', fullPage: true });
  await nav().getByRole('button', { name: 'Расписание', exact: true }).click();
  await page.getByRole('tab', { name: 'Неделя', exact: true }).click();
  await page.getByRole('region', { name: 'Расписание на неделю', exact: true }).waitFor();
  await noOverflow('Full week 360');
  await page.screenshot({ path: out + '/schedule-week-360.png', fullPage: true });
  const days = page.getByRole('region', { name: 'Расписание на неделю', exact: true }).locator('details');
  assert.equal(await days.count(), 6);
  const teachingDay = days.filter({ has: page.locator('ol') }).first();
  await teachingDay.locator('summary').focus();
  await page.keyboard.press('Enter');
  await teachingDay.locator('ol').waitFor();
  await page.keyboard.press('Enter');
  await teachingDay.locator('ol').waitFor({ state: 'hidden' });
  const calendarDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'В календарь', exact: true }).click();
  const calendar = await calendarDownload;
  assert(calendar.suggestedFilename().endsWith('.ics'));
  const ics = await readFile(await calendar.path(), 'utf8');
  assert(ics.includes('BEGIN:VCALENDAR') && ics.includes('TZID:Europe/Moscow'));
  assert(ics.includes('BEGIN:VEVENT'));
  assert(ics.endsWith('END:VCALENDAR\r\n'));
  assert(!ics.includes(owner) && !ics.includes('sokolov@'));
  await context.setOffline(true);
  await page.getByRole('status').getByText('Нет соединения.', { exact: false }).waitFor();
  await page.screenshot({ path: out + '/offline-360.png', fullPage: false });
  await context.setOffline(false);
  await page.getByRole('status').getByText('Нет соединения.', { exact: false }).waitFor({ state: 'hidden' });
  await nav().getByRole('button', { name: 'Главная', exact: true }).click();

  // A priority opens the exact at-risk subject, with a persistent booking form.
  await page.getByRole('region', { name: 'Что требует внимания', exact: true }).getByRole('button').filter({ hasText: 'Микроэкономика' }).click();
  let dialog = page.getByRole('dialog'); await dialog.getByRole('heading', { name: 'Микроэкономика', exact: true }).waitFor();
  await dialog.getByLabel('Свободное время').selectOption({ index: 1 }); await dialog.getByRole('button', { name: 'Записаться', exact: true }).click(); await dialog.getByText('Вы записаны:', { exact: false }).waitFor();
  for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); assert(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))); }
  await page.screenshot({ path: out + '/consultation-360.png', fullPage: false }); await closeDialog();
  await page.reload(); await nav().getByRole('button', { name: 'БРС', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Микроэкономика', exact: true }) }).click();
  await page.getByText('Вы записаны:', { exact: false }).waitFor(); await closeDialog();
  await page.getByRole('region', { name: 'Сессия', exact: true }).waitFor();
  // New request, cancellation, and persistence.
  await nav().getByRole('button', { name: 'Заявки', exact: true }).click(); await page.getByRole('button', { name: 'Новая заявка', exact: true }).click();
  await page.locator('#request-title').pressSequentially('Тестовая справка'); assert.equal(await page.locator('#request-title').inputValue(), 'Тестовая справка');
  await context.route('**/api/student', async route => {
    const body = route.request().postDataJSON();
    if (body?.action === 'create_request') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Тест: деканат временно недоступен' }) });
    return route.continue();
  });
  await page.getByRole('button', { name: 'Отправить в деканат', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').getByText('Тест: деканат временно недоступен', { exact: true }).waitFor();
  assert.equal(await page.locator('#request-title').inputValue(), 'Тестовая справка');
  await page.screenshot({ path: out + '/request-error-360.png', fullPage: false });
  await context.unroute('**/api/student');
  await page.getByRole('button', { name: 'Отправить в деканат', exact: true }).click();
  dialog = page.getByRole('dialog'); await dialog.getByRole('heading', { name: 'Тестовая справка', exact: true }).waitFor();
  const request = (await api('/api/student')).account.requestsData.find(r => r.title === 'Тестовая справка'); assert(request);
  // Second student cannot inspect or edit the request; staff role is checked on API.
  const other = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await api('/api/auth', { login: 'a.volkov@my.mgimo.ru', password: 'mgimo2026' }, other);
  const otherAccount = (await api('/api/student', undefined, other)).account;
  assert(!otherAccount.requestsData.some(r => r.id === request.id));
  assert.equal((await api('/api/staff', undefined, other)).status, 403);
  assert.equal((await api('/api/student', { action: 'cancel_request', ownerId: otherAccount.id, id: request.id, expectedRevision: 0 }, other)).status, 404);
  const staffContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const staffPage = await staffContext.newPage(); staffPage.on('pageerror', e => errors.push(e.message));
  await staffPage.goto('http://localhost:5173'); await staffPage.locator('#login').fill('dean.demo@my.mgimo.ru'); await staffPage.locator('#password').fill('dean2026demo'); await staffPage.getByRole('button', { name: 'Войти в кабинет', exact: true }).click(); await staffPage.getByRole('heading', { name: 'Кабинет сотрудника' }).waitFor();
  let article = staffPage.getByRole('article', { name: 'Тестовая справка', exact: true }); await article.waitFor();
  await article.getByLabel('Комментарий сотрудника').fill('Уточните назначение'); await article.getByRole('button', { name: 'Нужно уточнение', exact: true }).click(); await article.getByText('Уточните назначение', { exact: false }).waitFor();
  await closeDialog(); await page.getByRole('button', { name: 'Обновить данные', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Тестовая справка', exact: true }) }).click();
  dialog = page.getByRole('dialog'); await dialog.getByLabel('Ваше уточнение').fill('Для учебной стажировки'); await dialog.getByRole('button', { name: 'Отправить уточнение', exact: true }).click(); await dialog.getByText('Для учебной стажировки', { exact: true }).waitFor();
  await staffPage.getByRole('button', { name: 'Обновить', exact: true }).click(); article = staffPage.getByRole('article', { name: 'Тестовая справка', exact: true });
  for (let stage = 2; stage <= 5; stage++) { await article.getByRole('button', { name: 'Следующий этап', exact: true }).click(); await staffPage.waitForFunction(async ({ id, stage }) => { const data = await (await fetch('/api/staff')).json(); return data.students.some(s => s.requests.some(r => r.id === id && r.stage === stage)); }, { id: request.id, stage }); await pause(150); }
  await staffPage.screenshot({ path: out + '/staff-360.png', fullPage: true });
  await closeDialog(); await page.getByRole('button', { name: 'Обновить данные', exact: true }).click(); await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Тестовая справка', exact: true }) }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Открыть документ', exact: true }).click(); await page.getByRole('dialog', { name: 'Демо-документ', exact: true }).waitFor();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Скачать PDF', exact: true }).click(); const download = await downloadEvent; assert(download.suggestedFilename().endsWith('.pdf')); const bytes = await readFile(await download.path()); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-'); await page.screenshot({ path: out + '/document-360.png', fullPage: false }); await closeDialog();
  await page.getByRole('button', { name: 'Новая заявка', exact: true }).click(); await page.locator('#request-title').fill('Отменяемая заявка'); await page.getByRole('button', { name: 'Отправить в деканат', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Отменить заявку', exact: true }).click(); await page.getByText('Заявка отменена', { exact: true }).waitFor(); await closeDialog();
  await page.reload(); await nav().getByRole('button', { name: 'Заявки', exact: true }).click(); await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Отменяемая заявка', exact: true }) }).click(); await page.getByText('Заявка отменена', { exact: true }).waitFor(); await closeDialog();
  for (const width of [360, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of ['Главная', 'Расписание', 'БРС', 'Заявки', 'ИИ-бот', 'Профиль']) { await nav().getByRole('button', { name: section, exact: true }).click(); await noOverflow(`${section} ${width}`); }
    await nav().getByRole('button', { name: 'Расписание', exact: true }).click(); await page.getByRole('tab', { name: 'Неделя', exact: true }).click(); await noOverflow('Week ' + width); await page.screenshot({ path: out + `/schedule-week-${width}.png`, fullPage: true });
    await nav().getByRole('button', { name: 'Главная', exact: true }).click(); await page.getByRole('heading', { name: 'Что требует внимания', exact: true }).waitFor(); await pause(1100); await page.screenshot({ path: out + `/home-${width}-ru.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 360, height: 800 }); await page.getByRole('button', { name: 'English', exact: true }).click(); await page.getByRole('heading', { name: 'Needs attention', exact: true }).waitFor();
  await page.getByText('Accessibility', { exact: true }).click(); await page.getByLabel('Larger text', { exact: true }).check(); await page.getByLabel('High contrast', { exact: true }).check(); await page.getByLabel('Reduce motion', { exact: true }).check();
  for (const section of ['Home', 'Schedule', 'Grades', 'Requests', 'Assistant', 'Profile']) { await nav().getByRole('button', { name: section, exact: true }).click(); await noOverflow('Accessible EN ' + section); }
  await nav().getByRole('button', { name: 'Home', exact: true }).click(); await page.getByRole('heading', { name: 'Needs attention', exact: true }).waitFor(); await pause(400); assert(await page.locator('article').evaluateAll(articles => articles.every(article => [...article.querySelectorAll('h3, span')].every(el => el.getBoundingClientRect().right <= article.getBoundingClientRect().right + 1))), 'Notice titles and dates must not be clipped in large text'); await page.screenshot({ path: out + '/home-360-accessible-en.png', fullPage: true });
  // Provider failure and a late response after signing into another account.
  let release; const gate = new Promise(resolve => release = resolve); let calls = 0;
  await context.route('**/api/chat', async route => { calls++; await gate; await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ response: 'Лимит провайдера ИИ исчерпан. Попробуйте позже.' }) }).catch(() => undefined); });
  await nav().getByRole('button', { name: 'Assistant', exact: true }).click(); await page.getByLabel('Message the assistant', { exact: true }).fill('Справка'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await nav().getByRole('button', { name: 'Schedule', exact: true }).click(); await nav().getByRole('button', { name: 'Assistant', exact: true }).click(); assert.equal(calls, 1); assert(await page.getByRole('button', { name: 'Send', exact: true }).isDisabled()); release(); await page.getByText('The AI provider limit has been reached. Try again later.', { exact: true }).waitFor(); await context.unroute('**/api/chat');
  let finishOld; const oldGate = new Promise(resolve => finishOld = resolve);
  await context.route('**/api/chat', async route => { await oldGate; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ response: 'OLD_ACCOUNT_RESPONSE' }) }).catch(() => undefined); });
  await page.getByLabel('Message the assistant', { exact: true }).fill('Old account message'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await nav().getByRole('button', { name: 'Profile', exact: true }).click(); await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.locator('#login').waitFor(); await page.locator('#login').fill('a.volkov@my.mgimo.ru'); await page.locator('#password').fill('mgimo2026'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('heading', { name: 'Needs attention', exact: true }).waitFor(); finishOld(); await pause(200); await nav().getByRole('button', { name: 'Assistant', exact: true }).click(); assert(!(await page.locator('body').innerText()).includes('OLD_ACCOUNT_RESPONSE')); assert(!(await page.locator('body').innerText()).includes('Old account message'));
  assert.deepEqual(errors, []);
  console.log('PASS: weekly overview, ICS download, offline warning, 360/430/1280, two students + staff, priority links, persisted consultation, clarification roundtrip, stage permissions, cancellation, actual PDF download, modal focus, RU/EN, accessibility, AI navigation lock and late-response isolation. AI mocked. Storage:', process.env.DATABASE_URL ? 'PostgreSQL' : 'local memory');
} catch (e) { console.error(logs.slice(-1500)); console.error('PAGE ERRORS', errors); if (page) { console.error((await page.locator('body').innerText()).slice(-2000)); await page.screenshot({ path: out + '/failure.png', fullPage: true }).catch(() => undefined); } throw e; }
finally { await browser?.close(); for (const c of children) c.kill('SIGTERM'); }
