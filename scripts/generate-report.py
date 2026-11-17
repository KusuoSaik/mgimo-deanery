"""Optional documentation tool: python -m pip install reportlab; python scripts/generate-report.py."""
from pathlib import Path
import re
from html import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable

ROOT = Path(__file__).resolve().parents[1]
pdfmetrics.registerFont(TTFont('Noto', str(ROOT / 'public/fonts/NotoSans-Regular.ttf')))
styles = getSampleStyleSheet()
for key in ['Normal', 'Title', 'Heading1', 'Heading2', 'Heading3']:
    styles[key].fontName = 'Noto'
styles['Normal'].fontSize = 9
styles['Normal'].leading = 14
styles['Normal'].spaceAfter = 7
styles['Title'].fontSize = 23
styles['Title'].leading = 30
styles['Heading1'].fontSize = 19
styles['Heading1'].leading = 25
styles['Heading2'].fontSize = 14
styles['Heading2'].leading = 20
styles.add(ParagraphStyle('CodeText', parent=styles['Normal'], textColor=colors.HexColor('#334155'), backColor=colors.HexColor('#f1f5f9'), borderPadding=6))


def inline(value):
    text = escape(value)
    text = re.sub(r'\*\*(.+?)\*\*', r'<font color="#0f172a">\1</font>', text)
    text = re.sub(r'`([^`]+)`', r'<font color="#1d4ed8">\1</font>', text)
    return re.sub(r'\[([^]]+)\]\(([^)]+)\)', r'\1 (\2)', text)


class ScreenshotTop(Flowable):
    """Place the top of a screenshot on the document page; leave the original PNG untouched."""
    def __init__(self, path):
        super().__init__()
        self.img = ImageReader(str(path))
        iw, ih = self.img.getSize()
        self.width = 235
        self.full_height = self.width * ih / iw
        self.height = min(590, self.full_height)

    def draw(self):
        self.canv.saveState()
        clip = self.canv.beginPath()
        clip.rect(0, 0, self.width, self.height)
        self.canv.clipPath(clip, stroke=0, fill=0)
        self.canv.drawImage(self.img, 0, self.height - self.full_height, width=self.width, height=self.full_height)
        self.canv.restoreState()


story, images, rows, paragraph = [], [], [], []


def flush():
    if paragraph:
        story.append(Paragraph(inline(' '.join(paragraph)), styles['Normal']))
        paragraph.clear()


def table():
    if not rows:
        return
    data = [[Paragraph(inline(cell), styles['Normal']) for cell in row] for row in rows]
    widths = [155, 345] if len(rows[0]) == 2 else None
    t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')), ('LINEBELOW', (0, 0), (-1, -1), .3, colors.HexColor('#cbd5e1')), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6)]))
    story.extend([t, Spacer(1, 10)])
    rows.clear()


for line in (ROOT / 'docs/PROCESS_007.md').read_text().splitlines():
    if line.startswith('!['):
        match = re.match(r'!\[(.*?)\]\((.*?)\)', line)
        if match:
            images.append((match[1], ROOT / 'docs' / match[2]))
        continue
    if line.startswith('|'):
        flush()
        cells = [c.strip() for c in line.strip('|').split('|')]
        if not all(re.fullmatch(r'[:\- ]+', c) for c in cells):
            rows.append(cells)
        continue
    table()
    if line.startswith('#'):
        flush()
        level = len(line) - len(line.lstrip('#'))
        story.append(Paragraph(inline(line.lstrip('#').strip()), styles['Title' if level == 1 else 'Heading2']))
    elif not line.strip():
        flush()
    elif line.startswith('> '):
        flush()
        story.append(Paragraph(inline(line[2:]), styles['CodeText']))
    elif re.match(r'^(- |\d+\. )', line):
        flush()
        story.append(Paragraph(inline(line), styles['Normal']))
    elif not images:
        paragraph.append(line)
flush()
table()
for caption, path in images:
    story.extend([PageBreak(), Paragraph(inline(caption), styles['Heading1']), Paragraph('Реальный Chromium · 360 px · верхний фрагмент. Полный PNG входит в исходный пакет.', styles['Normal']), Spacer(1, 8), ScreenshotTop(path)])


def footer(canvas, doc):
    canvas.setFont('Noto', 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(42, 24, 'Цифровой деканат · Конкурсный концепт · Вымышленные данные')
    canvas.drawRightString(553, 24, str(doc.page))


target = ROOT / 'docs/PROCESS_007.pdf'
SimpleDocTemplate(str(target), rightMargin=42, leftMargin=42, topMargin=40, bottomMargin=42, title='Цифровой деканат — процесс доработки', author='Конкурсный прототип').build(story, onFirstPage=footer, onLaterPages=footer)
print(target)
