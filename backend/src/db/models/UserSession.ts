import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface UserSessionAttributes {
  id: number;
  user_id: number;
  token_hash: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at?: Date;
}

type UserSessionCreationAttributes = Optional<UserSessionAttributes, 'id' | 'ip_address' | 'user_agent' | 'created_at'>;

export class UserSession extends Model<UserSessionAttributes, UserSessionCreationAttributes>
  implements UserSessionAttributes {
  declare id: number;
  declare user_id: number;
  declare token_hash: string;
  declare ip_address: string;
  declare user_agent: string;
  declare expires_at: Date;
  declare created_at: Date;
}

UserSession.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:    { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.TEXT, allowNull: false, unique: true },
    ip_address: { type: DataTypes.TEXT },
    user_agent: { type: DataTypes.TEXT },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'user_sessions', timestamps: true, createdAt: 'created_at', updatedAt: false },
);
