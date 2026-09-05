import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { DbInitService } from './db-init.service'

;(BigInt.prototype as any).toJSON = function () { return this.toString() }

async function bootstrap() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const isDev = process.env.NODE_ENV !== 'production'

  // Init DB (create tables + admin) BEFORE starting NestJS
  const dbInit = new DbInitService()
  await dbInit.initDb(dbUrl)

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Restrict CORS to known local origins only
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3002',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3002',
    ],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )

  app.setGlobalPrefix('api')

  // Swagger only in development — avoids information disclosure in production
  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('AbyteMedix API')
      .setDescription('Medical Store Management System — REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))
  }

  const port = process.env.PORT ?? 5000
  await app.listen(port, '0.0.0.0')
  console.log(`AbyteMedix server running on http://0.0.0.0:${port}`)
}
bootstrap()
