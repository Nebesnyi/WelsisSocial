/**
 * Утилита пагинации
 *
 * parsePagination(query, opts) — парсит и клампит limit/offset из req.query.
 * Применяется в любом роуте, который возвращает список.
 *
 * Почему нужен клампинг:
 *   ?limit=999999 вернёт все записи без ограничений и убьёт память.
 *   ?limit=-1 или ?limit=abc без обработки пройдут в SQL как NaN/0.
 */

/**
 * @param {object} query     - req.query
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit=20]  - Лимит по умолчанию
 * @param {number} [opts.maxLimit=100]     - Абсолютный максимум
 * @returns {{ limit: number, offset: number, page: number }}
 */
function parsePagination(query, opts = {}) {
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit     = opts.maxLimit     ?? 100;

  let limit  = parseInt(query.limit,  10);
  let offset = parseInt(query.offset, 10);
  let page   = parseInt(query.page,   10);

  // Нормализуем limit
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  // Поддерживаем оба способа: ?offset=40 или ?page=3
  if (Number.isFinite(page) && page >= 1) {
    offset = (page - 1) * limit;
  } else {
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
  }

  return { limit, offset, page: Math.floor(offset / limit) + 1 };
}

/**
 * Собрать объект meta для ответа.
 * total — полное количество записей (если известно, иначе null).
 */
function paginationMeta({ limit, offset, total = null }) {
  const meta = { limit, offset };
  if (total !== null) {
    meta.total = total;
    meta.pages = Math.ceil(total / limit);
    meta.hasMore = offset + limit < total;
  }
  return meta;
}

module.exports = { parsePagination, paginationMeta };
