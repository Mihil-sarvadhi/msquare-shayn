export const SOURCE = {
  SHOPIFY: 'shopify',
  MYNTRA: 'myntra',
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  UNICOMMERCE: 'unicommerce',
} as const;

export type SourceType = (typeof SOURCE)[keyof typeof SOURCE];

export const SOURCE_VALUES: SourceType[] = Object.values(SOURCE);

export function isValidSource(value: string): value is SourceType {
  return SOURCE_VALUES.includes(value as SourceType);
}
