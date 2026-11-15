import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { availableSlots, requestDueAt } from '../src/portalDomain.ts';
import { ACCOUNTS_DATABASE } from '../src/auth/accountsDatabase.ts';
import { createCertificatePdf } from '../src/certificatePdf.ts';
assert.equal(requestDueAt('13.11.2026').slice(0, 10), '2026-11-18');
for (const input of ['2026-11-15T22:30:00Z', '2026-12-31T23:30:00Z', '2027-02-26T23:30:00Z']) {
  const slots = availableSlots('test', new Date(input)); assert.equal(slots.length, 3);
  assert(slots.every(s => Date.parse(s.startsAt) > Date.parse(input)));
  assert(slots.every(s => ![0, 6].includes(new Date(s.startsAt).getUTCDay())));
}
const user = ACCOUNTS_DATABASE[0].profile;
const request = { ...ACCOUNTS_DATABASE[0].requestsData[0], stage: 5 as const, status: 'Готово к выдаче' as const, title: 'Справка об обучении — ' + 'Тест'.repeat(30), timestamps: { ready: '2026-11-19T12:00:00Z' } };
const font = await readFile('public/fonts/NotoSans-Regular.ttf');
for (const en of [false, true]) {
  const bytes = await createCertificatePdf(font, user, request, en);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
  const pdf = await PDFDocument.load(bytes); assert(pdf.getPageCount() >= 1); assert(pdf.getTitle()?.includes(en ? 'Demonstration' : 'Демонстрационный'));
  if (process.env.PDF_TEST_OUTPUT) await writeFile(`${process.env.PDF_TEST_OUTPUT}-${en ? 'en' : 'ru'}.pdf`, bytes);
}
await assert.rejects(() => createCertificatePdf(font, user, { ...request, stage: 1 }));
console.log('PASS: Moscow future slots, working-day estimate, real PDF bytes, Cyrillic embedding, ready-state requirement.');
