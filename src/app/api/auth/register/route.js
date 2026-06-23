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
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: '用户名长度需在 2-20 个字符之间' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少 6 位' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: '用户名已被注册' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, passwordHash },
      select: { id: true, username: true, createdAt: true },
    })

    const token = await signToken({ userId: user.id, username: user.username })
    const response = NextResponse.json({ user }, { status: 201 })

    const opts = cookieOptions()
    response.cookies.set(opts.name, token, opts)

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}
