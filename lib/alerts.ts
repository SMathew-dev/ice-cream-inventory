export type StockStatus = 'OUT' | 'CRITICAL' | 'LOW' | 'OK';

export type StockAlertInput = {
  flavor: string;
  packageSize: '3_GALLON' | '48_OZ';
  onHand: number;
  reserved: number;
  labHold: number;
  lowThreshold: number;
  criticalThreshold: number;
  averageWeeklyUse?: number;
};

export function stockStatus(input: StockAlertInput): StockStatus {
  const available = Math.max(0, input.onHand - input.reserved);
  if (available === 0) return 'OUT';
  if (available <= input.criticalThreshold) return 'CRITICAL';
  if (available <= input.lowThreshold) return 'LOW';
  return 'OK';
}

export function estimatedDaysRemaining(available: number, averageWeeklyUse?: number) {
  if (!averageWeeklyUse || averageWeeklyUse <= 0) return null;
  return Math.max(0, Math.round((available / averageWeeklyUse) * 7 * 10) / 10);
}

export function buildStockMessage(input: StockAlertInput) {
  const available = Math.max(0, input.onHand - input.reserved);
  const status = stockStatus(input);
  const days = estimatedDaysRemaining(available, input.averageWeeklyUse);
  const incoming = input.labHold > 0 ? `${input.labHold} currently in -40°F lab hold.` : 'No product currently in lab hold.';
  if (status === 'OUT') return `${input.flavor} is out of available stock. ${incoming}`;
  if (status === 'CRITICAL') return `${input.flavor} is critical: ${available} available${days !== null ? `, about ${days} days at recent usage` : ''}. ${incoming}`;
  if (status === 'LOW') return `${input.flavor} is running low: ${available} available${days !== null ? `, about ${days} days at recent usage` : ''}. ${incoming}`;
  return `${input.flavor}: ${available} available. ${incoming}`;
}
