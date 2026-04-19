import type { ClientHttp2Session } from "node:http2";
import { connect, constants as h2 } from "node:http2";

import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { importPKCS8, SignJWT } from "jose";

import { config } from "../config/app.config.js";
import { DeviceTokensService } from "./device-tokens.service.js";

const APNS_STATUS_OK = 200;
const APNS_STATUS_UNREGISTERED = 410;
const TOKEN_LOG_PREFIX_LENGTH = 8;

interface ApnsResponse {
  statusCode: number;
  body: string;
}

interface JwtCacheEntry {
  token: string;
  expiresAt: number;
}

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);

  private readonly keyId: string;
  private readonly teamId: string;
  private readonly privateKeyPem: string;
  private readonly bundleId: string;

  private readonly jwtCache = new Map<string, JwtCacheEntry>();
  private readonly jwtRefreshInFlight = new Map<string, Promise<string>>();
  private readonly sessions = new Map<string, ClientHttp2Session>();

  constructor(
    configService: ConfigService,
    private readonly deviceTokensService: DeviceTokensService,
  ) {
    this.keyId = configService.getOrThrow<string>("APNS_KEY_ID");
    this.teamId = configService.getOrThrow<string>("APNS_TEAM_ID");
    this.privateKeyPem = configService
      .getOrThrow<string>("APNS_PRIVATE_KEY")
      .replace(/\\n/g, "\n");
    this.bundleId = configService.getOrThrow<string>("APNS_BUNDLE_ID");
  }

  public onModuleDestroy(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }
    this.sessions.clear();
  }

  public async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.deviceTokensService.findByUser(userId);
    if (tokens.length === 0) {
      return;
    }

    await Promise.all(
      tokens.map(async ({ token, environment }) =>
        this.sendToToken(token, environment, title, body, data),
      ),
    );
  }

  public async sendBroadcast(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const { broadcastBatchSize } = config.apns;

    for (let i = 0; i < userIds.length; i += broadcastBatchSize) {
      const batch = userIds.slice(i, i + broadcastBatchSize);
      await Promise.all(
        batch.map(async (userId) => this.sendToUser(userId, title, body, data)),
      );
    }
  }

  public async sendToToken(
    token: string,
    environment: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const host =
      environment === "sandbox"
        ? config.apns.host.sandbox
        : config.apns.host.production;

    try {
      const jwt = await this.getJwt(environment);
      const session = this.getSession(host, environment);
      const response = await this.sendRequest(
        session,
        host,
        token,
        jwt,
        title,
        body,
        data,
      );

      if (response.statusCode === APNS_STATUS_UNREGISTERED) {
        this.logger.warn(
          `Removing unregistered APNs token: ${token.slice(0, TOKEN_LOG_PREFIX_LENGTH)}...`,
        );
        await this.deviceTokensService.deleteByToken(token);
      } else if (response.statusCode !== APNS_STATUS_OK) {
        this.logger.error(
          `APNs rejected push: status=${response.statusCode} body=${response.body}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "APNs send error",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async getJwt(environment: string): Promise<string> {
    const cached = this.jwtCache.get(environment);
    if (cached !== undefined && Date.now() < cached.expiresAt) {
      return cached.token;
    }

    const inFlight = this.jwtRefreshInFlight.get(environment);
    if (inFlight !== undefined) {
      return inFlight;
    }

    const refreshPromise = this.signNewJwt();
    this.jwtRefreshInFlight.set(environment, refreshPromise);

    try {
      const token = await refreshPromise;
      this.jwtCache.set(environment, {
        token,
        expiresAt: Date.now() + config.apns.jwtCacheTtlMs,
      });
      return token;
    } finally {
      this.jwtRefreshInFlight.delete(environment);
    }
  }

  private async signNewJwt(): Promise<string> {
    const privateKey = await importPKCS8(this.privateKeyPem, "ES256");
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: this.keyId })
      .setIssuedAt()
      .setIssuer(this.teamId)
      .sign(privateKey);
  }

  private getSession(host: string, environment: string): ClientHttp2Session {
    const existing = this.sessions.get(environment);
    if (existing !== undefined && !existing.destroyed && !existing.closed) {
      return existing;
    }

    const session = connect(`https://${host}`);

    session.on("error", (error) => {
      this.logger.error(
        `APNs HTTP/2 session error (${environment})`,
        error.stack,
      );
      this.sessions.delete(environment);
    });

    session.on("close", () => {
      this.sessions.delete(environment);
    });

    this.sessions.set(environment, session);
    return session;
  }

  private async sendRequest(
    session: ClientHttp2Session,
    host: string,
    token: string,
    jwt: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<ApnsResponse> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        aps: {
          alert: { title, body },
          sound: "default",
        },
        ...data,
      });

      /* eslint-disable @typescript-eslint/naming-convention */
      const apnsHeaders: Record<string, string> = {
        "apns-topic": this.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
      };
      /* eslint-enable @typescript-eslint/naming-convention */

      const req = session.request({
        [h2.HTTP2_HEADER_METHOD]: "POST",
        [h2.HTTP2_HEADER_PATH]: `/3/device/${token}`,
        [h2.HTTP2_HEADER_SCHEME]: "https",
        [h2.HTTP2_HEADER_AUTHORITY]: host,
        [h2.HTTP2_HEADER_AUTHORIZATION]: `bearer ${jwt}`,
        [h2.HTTP2_HEADER_CONTENT_TYPE]: "application/json",
        [h2.HTTP2_HEADER_CONTENT_LENGTH]: String(Buffer.byteLength(payload)),
        ...apnsHeaders,
      });

      req.on("response", (headers) => {
        const statusCode = Number(headers[h2.HTTP2_HEADER_STATUS]);
        let responseBody = "";
        req.on("data", (chunk: Buffer) => {
          responseBody += chunk.toString();
        });
        req.on("end", () => {
          resolve({ statusCode, body: responseBody });
        });
      });

      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }
}
