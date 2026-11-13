import { StorageAdapter } from '../storage/storage.adapter';

export class DatabaseInstrumentor {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * Instrument MongoDB driver
   */
  public instrumentMongoDB(mongoClientModule: any): void {
    if (!mongoClientModule) return;
    try {
      const originalConnect = mongoClientModule.MongoClient?.prototype?.connect;
      if (originalConnect && !originalConnect.__plutosInstrumented) {
        const storage = this.storage;
        mongoClientModule.MongoClient.prototype.connect = async function (...args: any[]) {
          const start = Date.now();
          let isError = false;
          try {
            return await originalConnect.apply(this, args);
          } catch (err) {
            isError = true;
            throw err;
          } finally {
            const duration = Date.now() - start;
            storage.recordDatabaseQuery('mongodb', duration, isError);
          }
        };
        mongoClientModule.MongoClient.prototype.connect.__plutosInstrumented = true;
      }
    } catch (e) {
      console.warn('[PlutosMonitor] Failed to instrument MongoDB driver:', e);
    }
  }

  /**
   * Instrument PostgreSQL driver ('pg')
   */
  public instrumentPostgres(pgModule: any): void {
    if (!pgModule || !pgModule.Client) return;
    try {
      const originalQuery = pgModule.Client.prototype.query;
      if (originalQuery && !originalQuery.__plutosInstrumented) {
        const storage = this.storage;
        pgModule.Client.prototype.query = function (...args: any[]) {
          const start = Date.now();
          const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;

          if (callback) {
            return originalQuery.call(this, ...args, (err: any, res: any) => {
              const duration = Date.now() - start;
              storage.recordDatabaseQuery('postgres', duration, !!err);
              callback(err, res);
            });
          } else {
            const promise = originalQuery.apply(this, args);
            if (promise && typeof promise.then === 'function') {
              return promise
                .then((res: any) => {
                  storage.recordDatabaseQuery('postgres', Date.now() - start, false);
                  return res;
                })
                .catch((err: any) => {
                  storage.recordDatabaseQuery('postgres', Date.now() - start, true);
                  throw err;
                });
            }
            return promise;
          }
        };
        pgModule.Client.prototype.query.__plutosInstrumented = true;
      }
    } catch (e) {
      console.warn('[PlutosMonitor] Failed to instrument PostgreSQL driver:', e);
    }
  }

  /**
   * Instrument MySQL driver ('mysql2')
   */
  public instrumentMySQL(mysqlModule: any): void {
    if (!mysqlModule || !mysqlModule.Connection) return;
    try {
      const originalQuery = mysqlModule.Connection.prototype.query;
      if (originalQuery && !originalQuery.__plutosInstrumented) {
        const storage = this.storage;
        mysqlModule.Connection.prototype.query = function (...args: any[]) {
          const start = Date.now();
          const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;

          if (callback) {
            return originalQuery.call(this, ...args, (err: any, results: any, fields: any) => {
              storage.recordDatabaseQuery('mysql', Date.now() - start, !!err);
              callback(err, results, fields);
            });
          } else {
            const res = originalQuery.apply(this, args);
            if (res && typeof res.then === 'function') {
              return res
                .then((data: any) => {
                  storage.recordDatabaseQuery('mysql', Date.now() - start, false);
                  return data;
                })
                .catch((err: any) => {
                  storage.recordDatabaseQuery('mysql', Date.now() - start, true);
                  throw err;
                });
            }
            return res;
          }
        };
        mysqlModule.Connection.prototype.query.__plutosInstrumented = true;
      }
    } catch (e) {
      console.warn('[PlutosMonitor] Failed to instrument MySQL driver:', e);
    }
  }

  /**
   * Instrument Redis driver ('ioredis')
   */
  public instrumentRedis(ioredisModule: any): void {
    if (!ioredisModule) return;
    try {
      const RedisClass = ioredisModule.default || ioredisModule;
      const originalSendCommand = RedisClass?.prototype?.sendCommand;
      if (originalSendCommand && !originalSendCommand.__plutosInstrumented) {
        const storage = this.storage;
        RedisClass.prototype.sendCommand = function (command: any, ...args: any[]) {
          const start = Date.now();
          const promise = originalSendCommand.call(this, command, ...args);
          if (promise && typeof promise.then === 'function') {
            promise
              .then(() => {
                storage.recordDatabaseQuery('redis', Date.now() - start, false);
              })
              .catch(() => {
                storage.recordDatabaseQuery('redis', Date.now() - start, true);
              });
          }
          return promise;
        };
        RedisClass.prototype.sendCommand.__plutosInstrumented = true;
      }
    } catch (e) {
      console.warn('[PlutosMonitor] Failed to instrument Redis driver:', e);
    }
  }
}
