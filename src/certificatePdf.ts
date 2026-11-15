import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { RequestItem, UserProfile } from './types';

import { certificateDate, certificateLines } from './certificateContent';
export async function createCertificatePdf(fontBytes: Uint8Array, user: UserProfile, request: RequestItem, en = false): Promise<Uint8Array> {
  if (request.stage !== 5) throw new Error('Документ ещё готовится.');
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(en ? 'Demonstration document' : 'Демонстрационный документ'); doc.setAuthor('Digital Deanery · Competition prototype');
  doc.setCreationDate(certificateDate(request)); doc.setModificationDate(certificateDate(request));
  let page = doc.addPage([595.28, 841.89]), y = 720;
  const navy = rgb(0.06, 0.09, 0.19), slate = rgb(0.25, 0.30, 0.38);
  function header() {
    page.drawRectangle({ x: 0, y: 754, width: 596, height: 88, color: navy });
    page.drawText(en ? 'DIGITAL DEANERY' : 'ЦИФРОВОЙ ДЕКАНАТ', { x: 42, y: 800, size: 18, font, color: rgb(1, 1, 1) });
    page.drawText(en ? 'COMPETITION PROTOTYPE · FICTIONAL DATA' : 'КОНКУРСНЫЙ ПРОТОТИП · ВЫМЫШЛЕННЫЕ ДАННЫЕ', { x: 42, y: 776, size: 10, font, color: rgb(0.98, 0.82, 0.38) });
    page.drawLine({ start: { x: 42, y: 75 }, end: { x: 553, y: 75 }, color: slate, thickness: 0.5 });
    page.drawText(en ? 'DEMO DOCUMENT · NOT VALID AS AN OFFICIAL CERTIFICATE' : 'ДЕМО-ДОКУМЕНТ · НЕ ИМЕЕТ ЮРИДИЧЕСКОЙ СИЛЫ', { x: 42, y: 52, size: 9, font, color: slate });
  }
  function line(value: string, size: number, color = slate) {
    if (y < 115) { page = doc.addPage([595.28, 841.89]); y = 720; header(); }
    page.drawText(value, { x: 42, y, size, font, color }); y -= size + 9;
  }
  function paragraph(value: string, size = 12) {
    const clean = Array.from(value, c => c.charCodeAt(0) < 32 ? ' ' : c).join('');
    let buffer = '';
    for (const word of clean.split(/\s+/)) {
      const candidate = buffer ? `${buffer} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= 505) { buffer = candidate; continue; }
      if (buffer) { line(buffer, size); buffer = ''; }
      for (const c of word) {
        if (font.widthOfTextAtSize(buffer + c, size) > 505) { line(buffer, size); buffer = ''; }
        buffer += c;
      }
    }
    if (buffer) line(buffer, size);
    y -= 12;
  }
  header();
  paragraph(en ? 'Demonstration document' : 'Демонстрационный документ', 20);
  paragraph(`${en ? 'Request ID' : 'Номер заявки'}: ${request.id}`, 10);
  paragraph(`${en ? 'Issued' : 'Дата готовности'}: ${certificateDate(request).toLocaleDateString(en ? 'en-GB' : 'ru-RU', { timeZone: 'Europe/Moscow' })}`, 10);
  for (const text of certificateLines(user, request, en)) paragraph(text);
  paragraph(en ? 'Signature: DEMONSTRATION ONLY' : 'Подпись: ДЕМОНСТРАЦИОННАЯ ИМИТАЦИЯ', 11);
  return doc.save();
}
