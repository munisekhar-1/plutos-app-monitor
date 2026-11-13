import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  NestModule,
  MiddlewareConsumer,
  DynamicModule,
  Module,
  Global,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PlutosMonitorOptions } from '../types';
import { PlutosMonitorServer } from '../server/monitor.server';

let globalMonitorServerInstance: PlutosMonitorServer | null = null;

export function getPlutosMonitorInstance(options?: PlutosMonitorOptions): PlutosMonitorServer {
  if (!globalMonitorServerInstance) {
    globalMonitorServerInstance = new PlutosMonitorServer(options);
  }
  return globalMonitorServerInstance;
}

@Injectable()
export class PlutosMonitorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const monitor = getPlutosMonitorInstance();
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const startTime = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        if (req && res) {
          const path = req.route?.path || req.path || req.url;
          monitor.getStorage().recordEndpointLatency(path, req.method || 'GET', res.statusCode || 200, duration);
        }
      }),
    );
  }
}

@Global()
@Module({})
export class PlutosModule implements NestModule {
  static register(options?: PlutosMonitorOptions): DynamicModule {
    getPlutosMonitorInstance(options);

    return {
      module: PlutosModule,
      providers: [
        {
          provide: 'PLUTOS_MONITOR_OPTIONS',
          useValue: options,
        },
        PlutosMonitorInterceptor,
      ],
      exports: [PlutosMonitorInterceptor],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    const monitor = getPlutosMonitorInstance();
    consumer.apply(monitor.getExpressMiddleware()).forRoutes('*');
  }
}
