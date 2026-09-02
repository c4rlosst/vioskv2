const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
})

export const money = (value) => peso.format(Number(value) || 0)

export const cartTotal = (items) =>
  items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)

export const cartCount = (items) =>
  items.reduce((sum, i) => sum + i.quantity, 0)
