/**
 * Employee ID generation. Format: <COMPANYCODE>-<5-digit sequence>, e.g. ACME-00001.
 * The sequence is derived from the current employee count for the company so it
 * stays human-readable and unique per company.
 */
function buildEmployeeId(companyCode, sequence) {
  const seq = String(sequence).padStart(5, '0');
  return `${companyCode.toUpperCase()}-${seq}`;
}

/** Derive a short uppercase company code from a company name. */
function deriveCompanyCode(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = cleaned.split(/\s+/);
  let code =
    words.length >= 2
      ? words.map((w) => w[0]).join('')
      : cleaned.slice(0, 4);
  return code.toUpperCase().slice(0, 6) || 'COMP';
}

module.exports = { buildEmployeeId, deriveCompanyCode };
