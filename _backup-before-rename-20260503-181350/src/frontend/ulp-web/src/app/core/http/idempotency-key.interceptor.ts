import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Per ULP convention (CLAUDE.md / NFR-REL-003): every mutating endpoint
 * accepts Idempotency-Key. We auto-attach one to each POST/PUT/PATCH unless
 * the caller already supplied one.
 */
export const idempotencyKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const mutates = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
  if (!mutates || req.headers.has('Idempotency-Key')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { 'Idempotency-Key': crypto.randomUUID() },
    })
  );
};
