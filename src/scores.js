export function categoryScore(results, category) {
  const items = (results || []).filter((r) =>
    category ? String(r.category).toLowerCase() === category.toLowerCase() : true
  );
  if (!items.length) return null;
  return Math.round((100 * items.filter((r) => r.pass).length) / items.length);
}

export function scoreColor(value) {
  if (value == null) return "#97a8be";
  if (value >= 80) return "#13ce66";
  if (value >= 50) return "#f7ba2a";
  return "#ff4949";
}
