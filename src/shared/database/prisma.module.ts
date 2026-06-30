import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

const prismaProvider = {
  provide: PrismaService,
  useFactory: (configService: ConfigService) => {
    const baseClient = new PrismaService(configService);
    const softDeleteModels = ['User', 'Group', 'Category', 'Expense'];

    const extended = baseClient.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model && softDeleteModels.includes(model)) {
              if (
                operation === 'findFirst' ||
                operation === 'findFirstOrThrow' ||
                operation === 'findMany' ||
                operation === 'count' ||
                operation === 'aggregate' ||
                operation === 'groupBy'
              ) {
                args.where = { ...args.where, deletedAt: null };
              } else if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const context = Prisma.getExtensionContext(this) as any;
                const newOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
                return context[model][newOp]({
                  ...args,
                  where: { ...args.where, deletedAt: null },
                });
              }
            }
            return query(args);
          },
        },
      },
    });

    // We proxy the extended client to ensure NestJS lifecycle hooks and custom methods on PrismaService
    // are still accessible and bound to the baseClient instance.
    return new Proxy(extended, {
      get(target, prop) {
        if (prop === 'onModuleInit') return baseClient.onModuleInit.bind(baseClient);
        if (prop === 'onModuleDestroy') return baseClient.onModuleDestroy.bind(baseClient);
        if (prop === 'healthCheck') return baseClient.healthCheck.bind(baseClient);
        return Reflect.get(target, prop);
      },
    }) as unknown as PrismaService;
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [prismaProvider],
  exports: [PrismaService],
})
export class PrismaModule {}
