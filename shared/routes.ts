import { z } from 'zod';
import { insertUserSchema, insertCompanySchema, users, companySettings, afdFiles, auditLogs, punches } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id',
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  company: {
    get: {
      method: 'GET' as const,
      path: '/api/company',
      responses: {
        200: z.custom<typeof companySettings.$inferSelect>(),
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/company',
      input: insertCompanySchema,
      responses: {
        200: z.custom<typeof companySettings.$inferSelect>(),
      },
    },
  },
  afd: {
    list: {
      method: 'GET' as const,
      path: '/api/afd',
      responses: {
        200: z.array(z.custom<typeof afdFiles.$inferSelect>()),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/afd/upload',
      responses: {
        200: z.object({
          message: z.string(),
          processedCount: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  timesheet: {
    getMirror: {
      method: 'GET' as const,
      path: '/api/timesheet/:userId',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    updatePunch: {
      method: 'PUT' as const,
      path: '/api/timesheet/punches/:id',
      input: z.object({
        timestamp: z.string(),
        justification: z.string(),
      }),
      responses: {
        200: z.any(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    deletePunch: {
      method: 'DELETE' as const,
      path: '/api/timesheet/punches/:id',
      input: z.object({
        justification: z.string(),
      }),
      responses: {
        204: z.void(),
        403: errorSchemas.unauthorized,
      },
    },
    createPunch: {
      method: 'POST' as const,
      path: '/api/timesheet/punches',
      input: z.object({
        userId: z.number(),
        timestamp: z.string(),
        justification: z.string(),
      }),
      responses: {
        201: z.any(),
        403: errorSchemas.unauthorized,
      },
    },
    clockIn: {
      method: 'POST' as const,
      path: '/api/timesheet/clock-in',
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
    listAdjustments: {
      method: 'GET' as const,
      path: '/api/timesheet/adjustments',
      responses: {
        200: z.array(z.any()),
        403: errorSchemas.unauthorized,
      },
    },
    createAdjustment: {
      method: 'POST' as const,
      path: '/api/timesheet/adjustments',
      input: z.object({
        type: z.string(),
        timestamp: z.string().optional(),
        justification: z.string(),
        attachmentUrl: z.string().optional(),
      }),
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
    processAdjustment: {
      method: 'POST' as const,
      path: '/api/timesheet/adjustments/:id/process',
      input: z.object({
        status: z.enum(['approved', 'rejected']),
        feedback: z.string().optional(),
      }),
      responses: {
        200: z.any(),
        403: errorSchemas.unauthorized,
      },
    },
  },
  reports: {
    exportErp: {
      method: 'GET' as const,
      path: '/api/reports/export/erp',
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
