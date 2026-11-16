/** Contact details shown in legal pages. Set CONTACT_EMAIL in the environment. */
export function contactEmail(): string | null {
  return process.env.CONTACT_EMAIL || null;
}
