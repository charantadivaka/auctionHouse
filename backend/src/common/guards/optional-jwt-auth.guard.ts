import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any, _info: any, _context: ExecutionContext, _status?: any) {
    // Return the user if authenticated, otherwise return null without throwing an error
    return user || null;
  }
}
