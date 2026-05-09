import { HttpException, HttpStatus } from "@nestjs/common";

export class SubscriptionRequiredException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: "SUBSCRIPTION_REQUIRED",
        message: "An active subscription is required",
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
