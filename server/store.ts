import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Order } from '../src/shared/payments';
import { config } from './config';

/**
 * Interfejs celowo minimalny — podmiana na Postgres/Prisma to jedna implementacja,
 * reszta backendu się nie zmienia.
 */
export interface OrderStore {
  create(order: Order): Promise<Order>;
  get(id: string): Promise<Order | null>;
  update(id: string, patch: Partial<Order>): Promise<Order | null>;
  findBySessionId(sessionId: string): Promise<Order | null>;
  findByProviderRef(ref: string): Promise<Order | null>;
  list(): Promise<Order[]>;
}

/** Dev/demo: pamięć + zapis do pliku, żeby restart serwera nie gubił zamówień. */
export class FileOrderStore implements OrderStore {
  private orders = new Map<string, Order>();
  private ready: Promise<void>;
  private file: string;
  private writing: Promise<void> = Promise.resolve();

  constructor(file = join(config.dataDir, 'orders.json')) {
    this.file = file;
    this.ready = this.load();
  }

  private async load() {
    try {
      const raw = await readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as Order[];
      parsed.forEach((o) => this.orders.set(o.id, o));
    } catch {
      // brak pliku przy pierwszym uruchomieniu — poprawny stan
    }
  }

  private persist() {
    const snapshot = [...this.orders.values()];
    this.writing = this.writing
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        await writeFile(this.file, JSON.stringify(snapshot, null, 2), 'utf8');
      })
      .catch((err) => {
        console.error('[store] nie udało się zapisać zamówień:', err);
      });
    return this.writing;
  }

  async create(order: Order) {
    await this.ready;
    this.orders.set(order.id, order);
    void this.persist();
    return order;
  }

  async get(id: string) {
    await this.ready;
    return this.orders.get(id) ?? null;
  }

  async update(id: string, patch: Partial<Order>) {
    await this.ready;
    const current = this.orders.get(id);
    if (!current) return null;
    const next: Order = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.orders.set(id, next);
    void this.persist();
    return next;
  }

  async findBySessionId(sessionId: string) {
    await this.ready;
    return [...this.orders.values()].find((o) => o.providerSessionId === sessionId) ?? null;
  }

  async findByProviderRef(ref: string) {
    await this.ready;
    return (
      [...this.orders.values()].find((o) => o.providerSessionId === ref || o.id === ref) ?? null
    );
  }

  async list() {
    await this.ready;
    return [...this.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const store: OrderStore = new FileOrderStore();
