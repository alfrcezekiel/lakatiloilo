import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';
import { PHOTO_MESSAGE } from './review-photos.service';

// The upload handling stops reading a photo past 4 MB and answers its own
// "File too large" (413). Photos from 2 to 4 MB are refused with the
// friendly message by ReviewPhotosService; this gives the same message for
// bigger ones, so travelers always see one clear sentence (ticket 81).
@Catch(PayloadTooLargeException)
export class PhotoTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(400)
      .json({ message: PHOTO_MESSAGE, error: 'Bad Request', statusCode: 400 });
  }
}
