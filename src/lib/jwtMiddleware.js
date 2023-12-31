import jwt from 'jsonwebtoken';
import User from '../models/user';

const jwtMiddleware = async (ctx, next) => {
  const token = ctx.cookies.get('access_token');
  if (!token) return next(); // no token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded 결과를 ctx의 state 안에 넣어주면 됨
    ctx.state.user = {
      _id: decoded._id,
      username: decoded.username,
    };
    // console.log(decoded);

    // 토큰의 남은 유효 기간이 3.5일 미만이면 재발급
    // iat : 만든 날짜, exp : 종료 일자
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 60 * 60 * 24 * 3.5) {
      const user = await User.findById(decoded._id);
      const token = user.generateToken();
      ctx.cookies.set('access_token', token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });
    }

    return next();
  } catch (e) {
    // 토큰 검증 실패
    return next();
  }
};

export default jwtMiddleware;
