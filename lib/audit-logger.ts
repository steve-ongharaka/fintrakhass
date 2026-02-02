import { prisma } from './db';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'view' | 'approve' | 'reject';

export interface AuditLogParams {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        timestamp: new Date(),
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        description: params.description,
        previousValues: params.previousValues ? JSON.stringify(params.previousValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        changedFields: params.changedFields ? JSON.stringify(params.changedFields) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestPath: params.requestPath,
      },
    });
  } catch (error) {
    // Don't let audit log failures break the main operation
    console.error('Failed to create audit log:', error);
  }
}

// Helper to extract user info from session
export function getUserInfoFromSession(session: any): {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
} {
  if (!session?.user) return {};
  const user = session.user as any;
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    userRole: user.role,
  };
}
