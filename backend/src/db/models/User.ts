import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'is_active' | 'created_at' | 'updated_at'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare role: string;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
  {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:          { type: DataTypes.TEXT, allowNull: false },
    email:         { type: DataTypes.TEXT, allowNull: false, unique: true },
    password_hash: { type: DataTypes.TEXT, allowNull: false },
    role:          { type: DataTypes.TEXT, allowNull: false, defaultValue: 'ADMIN' },
    is_active:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
);
