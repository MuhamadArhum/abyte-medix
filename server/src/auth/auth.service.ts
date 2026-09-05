import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const payload = { sub: user.id, username: user.username, role: user.role }
    const accessToken = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    }
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('User account is inactive')
    }

    const payload = { sub: stored.user.id, username: stored.user.username, role: stored.user.role }
    const accessToken = this.jwt.sign(payload)

    // Rotate refresh token — revoke old, issue new
    const newRefreshToken = this.jwt.sign(payload, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    })
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }),
      this.prisma.refreshToken.create({ data: { token: newRefreshToken, userId: stored.user.id, expiresAt } }),
    ])

    return { accessToken, refreshToken: newRefreshToken }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    })
  }
}
