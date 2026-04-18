/**
 * Ambient types for `@prisma/client` in this package (no local `prisma generate`).
 * Runtime must use a generated client from the owning app/service.
 */
type PrismaModelDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findMany(args?: { where?: Record<string, unknown> }): Promise<unknown[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: Record<string, unknown> }): Promise<unknown>;
};

declare module '@prisma/client' {
  export class PrismaClient {
    constructor();
    readonly alert: PrismaModelDelegate;
    readonly portfolioHolding: PrismaModelDelegate;
    readonly portfolio: PrismaModelDelegate;
    readonly strategy: PrismaModelDelegate;
    readonly transaction: PrismaModelDelegate;
  }
}
