export function localDay(d = new Date()) {
  const pad = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
export function shiftDay(day, offset) {
  const [y,m,d] = day.split('-').map(Number);
  return localDay(new Date(y,m-1,d+offset,12));
}
export function completion(habits, value) {
  const secular = habits.filter(h=>h.category!=='Deen');
  return {done:secular.filter(h=>value(h)>=h.target).length,total:secular.length};
}
export function csvCell(value) {
  let s=String(value??'');
  if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
