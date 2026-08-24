import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.auth.login(body.username, body.password)
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    return this.auth.logout(body.refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@CurrentUser() user: any) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
    }
  }
}
