export const formatCurrency = (amount, currencyCode = 'USD', includeDecimals = true) => {
  const numericAmount = Number(amount) || 0;
  
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if the currency code is invalid or not supported
    console.warn(`Invalid currency code: ${currencyCode}. Falling back to USD.`);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(numericAmount);
  }
};
