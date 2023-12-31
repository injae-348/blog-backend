import User from '../../models/user';
import Joi from 'joi';

// 회원 인증 API, 새로운 라우터 정의

/**
 * POST /api/auth/register
 * {
 *  username:'velopert',
 *  password:'mypass123'
 * }
 */
export const register = async (ctx) => {
  // Request Body 검증하기
  const schema = Joi.object().keys({
    username: Joi.string().alphanum().min(3).max(20).required(),
    password: Joi.string().required(),
  });

  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { username, password } = ctx.request.body;
  try {
    // username 이미 존재하는지
    const exists = await User.findByUsername(username);
    if (exists) {
      ctx.status = 409; // conflict
      return;
    }

    const user = new User({
      username,
    });
    await user.setPassword(password);
    await user.save(); // db에 저장

    // serialize 함수 만들어줌
    // 응답할 데이터에서 hashedPassword 필드 제거
    // const data = user.toJSON();
    // delete data.hashedPassword;
    ctx.body = user.serialize();

    // token 을 만들어서 쿠키에 담아서 사용
    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * POST /api/auth/login
 * {
 *  username: 'velopert',
 *  password: 'mypass123'
 * }
 */
export const login = async (ctx) => {
  const { username, password } = ctx.request.body;

  // username, password가 없으면 에러 처리
  if (!username || !password) {
    ctx.status = 401;
    return;
  }

  try {
    const user = await User.findByUsername(username);
    // 계정이 없으면 에러처리
    if (!user) {
      ctx.status = 401;
      return;
    }
    const valid = await user.checkPassword(password);
    // 잘못된 비밀번호
    if (!valid) {
      ctx.status = 401;
      return;
    }
    ctx.body = user.serialize();
    const token = user.generateToken();
    ctx.cookies.set('access_token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
    });
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * GET /api/auth/check
 */
export const check = async (ctx) => {
  const { user } = ctx.state;
  if (!user) {
    // 로그인 중 아님
    ctx.status = 401; // unauthorized
  }
  ctx.body = user;
};

/**
 * POST /api/auth/logout
 */
export const logout = async (ctx) => {
  ctx.cookies.set('access_token');
  ctx.status = 204; // no content
};
