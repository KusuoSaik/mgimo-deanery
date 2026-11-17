# Промпт для Cursor Agent

Распакуй архив рядом с проектом. Вставь в Cursor Agent следующий текст, указав путь к распакованной папке:

```text
Проверь и примени доработку моего проекта https://github.com/KusuoSaik/mgimo-deanery из <ПУТЬ К ПАПКЕ deanery-delivery-008> и отправь результат в новую ветку GitHub. Commit и обычный push новой ветки разрешены. Сохрани мои текущие изменения, не используй reset --hard и force push.

1. Проверь remote, status, HEAD. Создай новую ветку contest/deanery-readiness-008, при занятости рабочей копии используй отдельный worktree.
2. В папке передачи два патча. cumulative-008.patch включает 007+008 и рассчитан на 70096ef5645868afdfaa39c830984bfa6dab8be9. incremental-008.patch содержит только новые исправления к 917061e90ced4fe69e83efff88f59ba59a0b4a70. Выбери ОДИН по фактическому содержимому checkout. Сначала git apply --check --whitespace=nowarn, затем применение. Если ветка изменилась, разреши конфликты по смыслу с опорой на source/. Существующие функции и мои правки сохрани. Не копируй source/ поверх проекта целиком. Если изменения уже присутствуют, не дублируй их.
3. Прочитай AGENTS.md, CLAUDE.md, docs/REVIEW_008.md и docs/CONTEST_READINESS.md. Проверь, что .ics содержит корректно вложенные компоненты и END:VCALENDAR; демо-отметка не обещает реальную геолокацию/запись; калькулятор не гарантирует освобождение от экзамена.
4. Node.js >=22.12: npm ci; npm run lint; npm run typecheck:api; npm run build; npm run build:server; npm test. Установи Chromium через npx playwright install chromium, затем npm run test:browser. При наличии Docker используй отдельную тестовую PostgreSQL, все три migrations/*.sql и проверь npm test, npm run test:storage, npm run test:ai:shared, npm run test:browser с её DATABASE_URL. Не запускай разрушающие тесты на рабочей базе. Не выдавай пропущенные проверки за успешные.
5. Не публикуй секреты, .env, node_modules, dist, build-server и дампы. Документы docs/evidence, docs/licenses и исторический PROCESS_007.pdf намеренно входят в исходники. REVIEW_008.md дополняет исторический PDF. Не переписывай историю проверок.
6. Проверь diff, сделай commit только своих изменений и git push -u origin contest/deanery-readiness-008 (либо уникальное имя при конфликте). Дай URL ветки, SHA и результаты тестов. При проблеме доступа сохрани локальный commit и объясни точную причину.
7. Для обновления хостинга нужна миграция 003_auth_attempts.sql, если пакет 007 ещё не развёрнут, и случайный SESSION_SECRET минимум 32 символа. Не применяй production-миграции автоматически. Инструкция VPS — docs/SELF_HOSTING.md. Публичный сайт, доступ из России, работа до 28 ноября и live-ИИ требуют отдельной проверки. Не объявляй гарантированные 40/40.
```
