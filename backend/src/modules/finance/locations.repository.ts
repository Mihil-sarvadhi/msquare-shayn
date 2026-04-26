import { Location } from '@db/models';
import { SOURCE } from '@constant';
import type { CreationAttributes } from 'sequelize';

export async function upsertLocations(
  rows: CreationAttributes<Location>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await Location.bulkCreate(rows, {
    updateOnDuplicate: [
      'name',
      'address',
      'active',
      'fulfills_online_orders',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
  });
  return rows.length;
}

export async function listLocations(): Promise<Location[]> {
  return Location.findAll({ where: { source: SOURCE.SHOPIFY }, order: [['name', 'ASC']] });
}
