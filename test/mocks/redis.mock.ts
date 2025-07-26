import { RedisClientType } from 'redis';

/**
 * Mock Redis Client for testing
 */
export class MockRedisClient {
  private storage = new Map<string, any>();
  private expiration = new Map<string, number>();
  private isConnected = false;

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.storage.clear();
    this.expiration.clear();
  }

  get isOpen(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    this.checkExpiration(key);
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<string> {
    this.storage.set(key, value);
    
    if (options?.EX) {
      this.expiration.set(key, Date.now() + options.EX * 1000);
    }
    
    return 'OK';
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let deleted = 0;
    
    for (const k of keys) {
      if (this.storage.has(k)) {
        this.storage.delete(k);
        this.expiration.delete(k);
        deleted++;
      }
    }
    
    return deleted;
  }

  async exists(key: string): Promise<number> {
    this.checkExpiration(key);
    return this.storage.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.storage.has(key)) {
      this.expiration.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    const expireTime = this.expiration.get(key);
    if (!expireTime) return -1;
    
    const remaining = Math.floor((expireTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];
    
    for (const key of this.storage.keys()) {
      this.checkExpiration(key);
      if (regex.test(key) && this.storage.has(key)) {
        matchingKeys.push(key);
      }
    }
    
    return matchingKeys;
  }

  async flushDb(): Promise<string> {
    this.storage.clear();
    this.expiration.clear();
    return 'OK';
  }

  async flushAll(): Promise<string> {
    return this.flushDb();
  }

  // Hash operations
  async hSet(key: string, field: string | Record<string, any>, value?: string): Promise<number> {
    if (!this.storage.has(key)) {
      this.storage.set(key, new Map());
    }
    
    const hash = this.storage.get(key);
    
    if (typeof field === 'string' && value !== undefined) {
      const oldSize = hash.size;
      hash.set(field, value);
      return hash.size - oldSize;
    } else if (typeof field === 'object') {
      let added = 0;
      for (const [f, v] of Object.entries(field)) {
        if (!hash.has(f)) added++;
        hash.set(f, v);
      }
      return added;
    }
    
    return 0;
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    this.checkExpiration(key);
    const hash = this.storage.get(key);
    return hash ? hash.get(field) : undefined;
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    this.checkExpiration(key);
    const hash = this.storage.get(key);
    if (!hash) return {};
    
    const result: Record<string, string> = {};
    for (const [field, value] of hash.entries()) {
      result[field] = value;
    }
    
    return result;
  }

  async hDel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.storage.get(key);
    if (!hash) return 0;
    
    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) {
        deleted++;
      }
    }
    
    if (hash.size === 0) {
      this.storage.delete(key);
      this.expiration.delete(key);
    }
    
    return deleted;
  }

  // List operations
  async lPush(key: string, ...values: string[]): Promise<number> {
    if (!this.storage.has(key)) {
      this.storage.set(key, []);
    }
    
    const list = this.storage.get(key);
    list.unshift(...values);
    return list.length;
  }

  async rPush(key: string, ...values: string[]): Promise<number> {
    if (!this.storage.has(key)) {
      this.storage.set(key, []);
    }
    
    const list = this.storage.get(key);
    list.push(...values);
    return list.length;
  }

  async lPop(key: string): Promise<string | null> {
    const list = this.storage.get(key);
    if (!list || list.length === 0) return null;
    
    const value = list.shift();
    if (list.length === 0) {
      this.storage.delete(key);
      this.expiration.delete(key);
    }
    
    return value;
  }

  async rPop(key: string): Promise<string | null> {
    const list = this.storage.get(key);
    if (!list || list.length === 0) return null;
    
    const value = list.pop();
    if (list.length === 0) {
      this.storage.delete(key);
      this.expiration.delete(key);
    }
    
    return value;
  }

  async lLen(key: string): Promise<number> {
    this.checkExpiration(key);
    const list = this.storage.get(key);
    return list ? list.length : 0;
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    this.checkExpiration(key);
    const list = this.storage.get(key);
    if (!list) return [];
    
    return list.slice(start, stop + 1);
  }

  // Set operations
  async sAdd(key: string, ...members: string[]): Promise<number> {
    if (!this.storage.has(key)) {
      this.storage.set(key, new Set());
    }
    
    const set = this.storage.get(key);
    let added = 0;
    
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    
    return added;
  }

  async sRem(key: string, ...members: string[]): Promise<number> {
    const set = this.storage.get(key);
    if (!set) return 0;
    
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    
    if (set.size === 0) {
      this.storage.delete(key);
      this.expiration.delete(key);
    }
    
    return removed;
  }

  async sMembers(key: string): Promise<string[]> {
    this.checkExpiration(key);
    const set = this.storage.get(key);
    return set ? Array.from(set) : [];
  }

  async sIsMember(key: string, member: string): Promise<number> {
    this.checkExpiration(key);
    const set = this.storage.get(key);
    return set && set.has(member) ? 1 : 0;
  }

  async sCard(key: string): Promise<number> {
    this.checkExpiration(key);
    const set = this.storage.get(key);
    return set ? set.size : 0;
  }

  // Multi/transaction support
  multi(): MockRedisMulti {
    return new MockRedisMulti(this);
  }

  private checkExpiration(key: string): void {
    const expireTime = this.expiration.get(key);
    if (expireTime && Date.now() > expireTime) {
      this.storage.delete(key);
      this.expiration.delete(key);
    }
  }
}

/**
 * Mock Redis Multi/Transaction
 */
export class MockRedisMulti {
  private commands: Array<{ method: string; args: any[] }> = [];

  constructor(private client: MockRedisClient) {}

  get(key: string): this {
    this.commands.push({ method: 'get', args: [key] });
    return this;
  }

  set(key: string, value: string, options?: { EX?: number }): this {
    this.commands.push({ method: 'set', args: [key, value, options] });
    return this;
  }

  del(key: string | string[]): this {
    this.commands.push({ method: 'del', args: [key] });
    return this;
  }

  async exec(): Promise<any[]> {
    const results: any[] = [];
    
    for (const command of this.commands) {
      try {
        const result = await (this.client as any)[command.method](...command.args);
        results.push(result);
      } catch (error) {
        results.push(error);
      }
    }
    
    this.commands = [];
    return results;
  }
}

/**
 * Factory for creating mock Redis clients
 */
export const createMockRedisClient = (): RedisClientType => {
  return new MockRedisClient() as any;
};

/**
 * Mock Redis client for Jest
 */
export const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushDb: jest.fn(),
  flushAll: jest.fn(),
  hSet: jest.fn(),
  hGet: jest.fn(),
  hGetAll: jest.fn(),
  hDel: jest.fn(),
  lPush: jest.fn(),
  rPush: jest.fn(),
  lPop: jest.fn(),
  rPop: jest.fn(),
  lLen: jest.fn(),
  lRange: jest.fn(),
  sAdd: jest.fn(),
  sRem: jest.fn(),
  sMembers: jest.fn(),
  sIsMember: jest.fn(),
  sCard: jest.fn(),
  multi: jest.fn(() => ({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
  isOpen: true,
};