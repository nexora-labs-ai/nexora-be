import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'ws') {
      return true;
    }

    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      throw new WsException('Unauthorized: Token missing');
    }

    try {
      const secret = this.configService.get<string>('jwt.accessSecret') || process.env.JWT_SECRET;
      const payload = this.jwtService.verify(token, { secret });

      // Attach the user info to the socket client
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (err) {
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // Check auth handshake payload
    let token = client.handshake.auth?.token;

    // Fallback to headers or query if auth isn't provided
    if (!token) {
      const authHeader = client.handshake.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else if (client.handshake.query?.token) {
        token = client.handshake.query.token as string;
      }
    }

    return token;
  }
}
