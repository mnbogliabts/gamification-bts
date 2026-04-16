import { Email } from '../value-objects/Email';
import { ValidationError } from '../../shared/errors';

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE_OAUTH = 'GOOGLE_OAUTH'
}

export interface UserProps {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: Email;
  passwordHash: string | null;
  role: UserRole;
  isActive: boolean;
  authProvider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(params: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: Email;
    passwordHash: string | null;
    role: UserRole;
    isActive?: boolean;
    authProvider?: AuthProvider;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    if (params.firstName !== undefined && params.firstName.length > 100) {
      throw new ValidationError('First name must not exceed 100 characters');
    }
    if (params.lastName !== undefined && params.lastName.length > 100) {
      throw new ValidationError('Last name must not exceed 100 characters');
    }

    return new User({
      id: params.id,
      username: params.username,
      firstName: params.firstName ?? '',
      lastName: params.lastName ?? '',
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      isActive: params.isActive ?? true,
      authProvider: params.authProvider ?? AuthProvider.LOCAL,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`.trim() || this.props.username;
  }

  getDisplayName(): string {
    const parts = [this.props.firstName, this.props.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : this.props.username;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get authProvider(): AuthProvider {
    return this.props.authProvider;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  updatePassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = new Date();
  }

  updateRole(role: UserRole): void {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      username: this.props.username,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      displayName: this.getDisplayName(),
      email: this.props.email.getValue(),
      role: this.props.role,
      isActive: this.props.isActive,
      authProvider: this.props.authProvider,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
