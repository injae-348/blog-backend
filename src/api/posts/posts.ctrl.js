import Post from '../../models/post';
import mongoose from 'mongoose';
import Joi from 'joi';

const { ObjectId } = mongoose.Types;

// id를 확인하는 함수에서 post를 가져오는 함수로 변환
export const getPostById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400;
    return;
  }
  try {
    const post = await Post.findById(id);
    // 포스트가 없다면
    if (!post) {
      ctx.status = 404; // not found
      return;
    }
    ctx.state.post = post;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 *  checkOwnPost : 미들웨어, id로 찾은 포스트가 로그인 중인
 * 사용자가 작성한 포스트인지 확인
 * 사용자가 작성한게 아닌경우 403 반환
 */
export const checkOwnPost = (ctx, next) => {
  const { user, post } = ctx.state;
  if (post.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }
  return next();
};

/**
 * POST /api/posts
 * {
 * title:'제목'
 * body:'내용'
 * tags:['태그1','태그2']
 * }
 */
export const write = async (ctx) => {
  const schema = Joi.object().keys({
    // 객체가 가진 필드
    // title: Joi.string().disallow(Joi.number()), // 숫자를 거부하여 문자열만 허용(뭔가 이상한디)
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required(),
  });

  // 검증하고 난후 검증 실패시 에러 처리
  // validate 쓰는 부분 책과 내용 다름
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // bad request
    ctx.body = result.error;
    return;
  }

  // user를 추가해서 누가 작성자인지 확인
  const { title, body, tags } = ctx.request.body;
  const post = new Post({
    title,
    body,
    tags,
    user: ctx.state.user,
  });
  try {
    await post.save();
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * GET /api/posts?username=&tag=&page=
 * find 호출뒤에 exec를 붙여야 서버에 쿼리를 요청함
 *
 */
export const list = async (ctx) => {
  // query는 문자열이여서 숫자로 변환 필요
  // 값이 주어지지 않으면 1을 기본으로 사용
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  // tag, username 값이 유효하면 객체에 넣고, 그렇지 않으면 넣지 않음
  const { tag, username } = ctx.query;
  const query = {
    ...(username ? { 'user.username': username } : {}),
    ...(tag ? { tags: tag } : {}),
  };

  try {
    // 역순으로 넣어주기 .sort({_id:-1})
    // 페이지에 보이는 포스터 개수 .limit(10)
    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(10)
      .skip((page - 1) * 10)
      .exec();

    // 커스텀 헤더를 설정하는 방식
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 10));
    ctx.body = posts
      .map((post) => post.toJSON())
      .map((post) => ({
        ...post,
        body:
          post.body.length < 200 ? post.body : `${post.body.slice(0, 200)}...`,
      }));
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * GET /api/posts/:id
 */
export const read = async (ctx) => {
  ctx.body = ctx.state.post;
};

/**
 * DELETE /api/posts/:id
 */
export const remove = async (ctx) => {
  const { id } = ctx.params;
  try {
    await Post.findByIdAndRemove(id).exec();
    ctx.status = 204; // success but there are no response data
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * PATCH /api/posts/:id
 * {
 *  title: '수정',
 *  body: '수정 내용',
 *  tags: ['수정','태그']
 * }
 */
export const update = async (ctx) => {
  const { id } = ctx.params;

  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  });

  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  try {
    const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
      new: true, // 이 값으로 update된 데이터 반환
      // false 인 경우 업데이트 전 내용 반환
    }).exec();
    if (!post) {
      ctx.status = 404;
      return;
    }
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};
