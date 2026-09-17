/**
 * The Book Orders screen's college and area filters, and its printed list.
 *
 * Pure functions over an order as GET /api/orders returns it (buyer populated).
 * The filters on the screen and the PDF list both go through them, so the PDF
 * holds exactly the orders the filters show.
 */

/** The buyer's medical college as the order recorded it, else their profile's. */
export const collegeOf = (o) => String(o?.college?.name || o?.user?.medicalCollegeName || '').trim();

/**
 * Where the parcel goes, as a district and an upazila taken from ONE place:
 * the shipping address when it names a district, else the college (the address
 * is prefilled from it, and older orders only have that), else the buyer's
 * profile. Never half from one and half from another.
 */
export const areaOf = (o) => {
  const pair = (district, upazila) => ({
    district: String(district || '').trim(),
    upazila: String(upazila || '').trim(),
  });
  const sa = o?.shippingAddress;
  if (sa?.district) return pair(sa.district, sa.upazila || sa.city);
  if (o?.college?.district) return pair(o.college.district, o.college.upazila);
  return pair(o?.user?.district, o?.user?.upazila);
};

/** Does an order belong to the chosen college and area? Empty means any. */
export const matchesPlace = (o, { college = '', district = '', upazila = '' } = {}) => {
  if (college && collegeOf(o) !== college) return false;
  if (!district && !upazila) return true;
  const area = areaOf(o);
  return (!district || area.district === district) && (!upazila || area.upazila === upazila);
};

/** Distinct non-empty values and how many orders have each, in alphabetical order. */
export const countOptions = (values) => {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'bn'));
};

/**
 * What the courier has to know about the money: nothing to collect (paid, or a
 * free order), cash to collect on delivery, or an online payment still unpaid.
 */
export const PAYMENT_LABEL = {
  paid: 'পেইড',
  cod: 'ক্যাশ অন ডেলিভারি',
  due: 'পেমেন্ট বাকি',
};

export const paymentKeyOf = (o) => {
  if (o?.payment?.status === 'paid' || o?.payment?.method === 'free' || o?.total === 0) return 'paid';
  return o?.payment?.method === 'cod' ? 'cod' : 'due';
};

/** One line of the printed list. The name is the recipient's, as on the parcel. */
export const printRowOf = (o) => {
  const sa = o?.shippingAddress || {};
  const { district, upazila } = areaOf(o);
  const accountName = [o?.user?.firstName, o?.user?.lastName].filter(Boolean).join(' ');
  // Street, upazila, district — skipping a part the address already ends with
  // ("Mitford, Dhaka" does not need another "Dhaka"; an older order can also
  // carry the same town as its city and its district).
  const parts = [];
  for (const part of [sa.address, upazila, district]) {
    const text = String(part || '').trim();
    const soFar = parts.join(', ').toLowerCase();
    const t = text.toLowerCase();
    if (text && soFar !== t && !soFar.endsWith(`, ${t}`) && !soFar.endsWith(` ${t}`)) parts.push(text);
  }
  return {
    id: o?._id,
    name: String(sa.name || accountName || o?.user?.email || '—').trim(),
    phone: sa.phone || o?.user?.phoneNumber || '',
    altPhone: sa.altPhone || '',
    college: collegeOf(o),
    address: sa.address ? parts.join(', ') : '',
    digital: o?.deliveryType === 'digital',
    payment: paymentKeyOf(o),
  };
};

/** "15 Sep 2026, 3:00 PM" in Bangladesh time — a printed list needs the year. */
export const formatBdFull = (instant) =>
  new Date(instant).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/** A title that is also a safe file name: the print dialog offers it as one. */
export const safeFileName = (text) =>
  String(text)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
