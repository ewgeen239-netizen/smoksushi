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

/**
 * Store dla środowisk serverless (Vercel/Upstash Redis, REST).
 * Konieczny na Vercelu: webhook i utworzenie zamówienia to osobne wywołania funkcji,
 * które nie dzielą pamięci — stan musi żyć poza procesem.
 * Włącza się automatycznie, gdy w env są KV_REST_API_URL + KV_REST_API_TOKEN.
 */
export class KvOrderStore implements OrderStore {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T = unknown>(command: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`KV ${command[0]} => HTTP ${res.status}`);
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  private key = (id: string) => `order:${id}`;
  private sessionKey = (sessionId: string) => `session:${sessionId}`;

  async create(order: Order) {
    await this.cmd(['SET', this.key(order.id), JSON.stringify(order)]);
    await this.cmd(['LPUSH', 'orders:index', order.id]);
    return order;
  }

  async get(id: string) {
    const raw = await this.cmd<string | null>(['GET', this.key(id)]);
    return raw ? (JSON.parse(raw) as Order) : null;
  }

  async update(id: string, patch: Partial<Order>) {
    const current = await this.get(id);
    if (!current) return null;
    const next: Order = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await this.cmd(['SET', this.key(id), JSON.stringify(next)]);
    // utrzymujemy indeks sesja -> zamówienie do obsługi webhooka
    if (patch.providerSessionId) {
      await this.cmd(['SET', this.sessionKey(patch.providerSessionId), id]);
    }
    return next;
  }

  async findBySessionId(sessionId: string) {
    const id = await this.cmd<string | null>(['GET', this.sessionKey(sessionId)]);
    return id ? this.get(id) : null;
  }

  async findByProviderRef(ref: string) {
    return (await this.findBySessionId(ref)) ?? (await this.get(ref));
  }

  async list() {
    const ids = await this.cmd<string[]>(['LRANGE', 'orders:index', 0, 99]);
    const orders = await Promise.all(ids.map((id) => this.get(id)));
    return orders.filter((o): o is Order => Boolean(o));
  }
}

const buildStore = (): OrderStore => {
  const kvUrl = process.env.KV_REST_API_URL?.trim();
  const kvToken = process.env.KV_REST_API_TOKEN?.trim();
  if (kvUrl && kvToken) {
    console.log('[store] Vercel KV (Upstash Redis)');
    return new KvOrderStore(kvUrl, kvToken);
  }
  console.log('[store] plikowy (dev/single-instance)');
  return new FileOrderStore();
};

export const store: OrderStore = buildStore();
