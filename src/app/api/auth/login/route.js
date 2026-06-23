import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signToken, cookieOptions } from '@/lib/jwt'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const token = await signToken({ userId: user.id, username: user.username })
    const response = NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
    })

    const opts = cookieOptions()
    response.cookies.set(opts.name, token, opts)

    return response
  } catch (error) {
    console.error('Login error:', error.message, error.stack)
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
