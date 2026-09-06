/**
 * Error Handling Middleware
 *
 * Global error handler for consistent error responses.
 * Handles custom AppError instances, ZodError validation, and unknown errors.
 */

import { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/classes";
import { ERROR_CODES, ERROR_CATEGORIES } from "../../../cod-shared/errors/codes";

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  error: string;
  code: string;
  category: string;
  context?: Record<string, any>;
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context): Response {
  // Generate request ID for tracing
  const requestId = crypto.randomUUID();

  // Log detailed error server-side
  console.error("[Error Handler]", {
    requestId,
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    // Include user info if available
    user: c.get("user")?.id || "anonymous",
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: "Validation failed",
      code: ERROR_CODES.VALIDATION_FAILED,
      category: ERROR_CATEGORIES.VALIDATION,
      context: {
        fields: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
    };

    return c.json(response, 400);
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.message,
      code: err.code,
      category: err.category,
      context: err.context,
    };

    return c.json(response, err.statusCode as any);
  }

  // Handle unknown errors — never leak the raw message (it can carry SQL,
  // table/column names, file paths, or secrets). The full details are in the
  // server log under this requestId; return the ID so the client can report it.
  const response: ErrorResponse = {
    error: "An unexpected error occurred",
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    category: ERROR_CATEGORIES.SYSTEM,
    context: { requestId },
  };

  return c.json(response, 500);
}
