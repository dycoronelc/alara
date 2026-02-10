"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const bigint_interceptor_1 = require("./common/bigint.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.set('trust proxy', 1);
    app.enableCors({ origin: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalInterceptors(new bigint_interceptor_1.BigIntInterceptor());
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map