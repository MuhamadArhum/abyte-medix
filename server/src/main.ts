import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

;(BigInt.prototype as any).toJSON = function () { return Number(this) }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({
    origin: true,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api')

  const config = new DocumentBuilder()
    .setTitle('AbyteMedix API')
    .setDescription('Medical Store Management System — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 5000
  await app.listen(port, '0.0.0.0')
  console.log(`AbyteMedix server running on http://0.0.0.0:${port}`)
  console.log(`Swagger docs: http://0.0.0.0:${port}/api/docs`)
}
bootstrap()
