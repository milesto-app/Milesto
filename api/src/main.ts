import "dotenv/config";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";
import { DatabaseLogger } from "./common/loggers/database-logger.service.js";
import { SupabaseService } from "./supabase/supabase.service.js";

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const supabaseService = app.get(SupabaseService);
  app.useLogger(new DatabaseLogger(supabaseService));

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "true"
  ) {
    const config = new DocumentBuilder()
      .setTitle("Milesto API")
      .setDescription("AI-powered personal coaching app API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup("docs", app, document);
  }

  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
