export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export interface AuditLogProps {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  timestamp: Date;
}

export class AuditLog {
  private constructor(private props: AuditLogProps) {}

  static create(params: {
    id: string;
    userId: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    changes?: Record<string, any> | null;
    ipAddress?: string | null;
    timestamp?: Date;
  }): AuditLog {
    // Validate required fields
    if (!params.action) {
      throw new Error('Action is required');
    }

    if (!params.entityType || params.entityType.trim().length === 0) {
      throw new Error('Entity type is required');
    }

    // Validate action is a valid enum value
    if (!Object.values(AuditAction).includes(params.action)) {
      throw new Error(`Invalid action: ${params.action}. Must be one of: ${Object.values(AuditAction).join(', ')}`);
    }

    return new AuditLog({
      id: params.id,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType.trim(),
      entityId: params.entityId ?? null,
      changes: params.changes ?? null,
      ipAddress: params.ipAddress ?? null,
      timestamp: params.timestamp ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string | null {
    return this.props.entityId;
  }

  get changes(): Record<string, any> | null {
    return this.props.changes ? { ...this.props.changes } : null;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      action: this.props.action,
      entityType: this.props.entityType,
      entityId: this.props.entityId,
      changes: this.props.changes,
      ipAddress: this.props.ipAddress,
      timestamp: this.props.timestamp.toISOString(),
    };
  }
}
