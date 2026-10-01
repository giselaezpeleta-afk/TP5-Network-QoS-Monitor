import { buildFilters } from '../src/history/HistoryCard';

test('rechaza fechas inexistentes o un rango invertido', () => {
  expect(() => buildFilters('', '2026-02-30', '', '')).toThrow(
    'Fecha inválida',
  );
  expect(() => buildFilters('', '2026-10-02', '2026-10-01', '')).toThrow(
    'anterior',
  );
});
test('incluye todo el día final local y combina red con área', () => {
  const filters = buildFilters(
    'wifi',
    '2026-10-01',
    '2026-10-01',
    '-35,-59,-34,-58',
  );
  expect(new Date(filters.to).getHours()).toBe(23);
  expect(new Date(filters.to).getMilliseconds()).toBe(999);
  expect(filters).toMatchObject({
    network: 'wifi',
    south: -35,
    west: -59,
    north: -34,
    east: -58,
  });
});
test('no convierte coordenadas vacías o invertidas en ubicaciones válidas', () => {
  expect(() => buildFilters('', '', '', ',,1,2')).toThrow();
  expect(() => buildFilters('', '', '', '20,10,10,20')).toThrow();
  expect(buildFilters('', '', '', '')).toEqual({});
});
