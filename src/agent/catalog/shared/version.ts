/** Performs the normalize version operation. */
export const normalizeVersion = (range: string): string => {
  const match = range.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : '0.0.0';
};
