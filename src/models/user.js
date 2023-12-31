import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const UserSchema = new Schema({
  username: String,
  hashedPassword: String,
});

// 인스턴스 메서드
// setPassword 비밀번호를 받아와 계정의 hashedPassword 값을 설정
// checkPassword 파라미터로 받은 비밀번호가 일치하는지 검증
UserSchema.methods.setPassword = async function (password) {
  const hash = await bcrypt.hash(password, 10);
  // this 문서 인스턴스를 가리킴 , 화살표 함수 사용 금지
  this.hashedPassword = hash;
};

UserSchema.methods.checkPassword = async function (password) {
  const result = await bcrypt.compare(password, this.hashedPassword);
  return result; // true or false
};

// JSON으로 변환후 delete로 hashedPassword 제거
UserSchema.methods.serialize = function () {
  const data = this.toJSON();
  delete data.hashedPassword;
  return data;
};

// 회원가입&로그인 성공시 토큰을 사용자에게 전달
UserSchema.methods.generateToken = function () {
  const token = jwt.sign(
    // 첫 번째 파라미터에는 토큰 안에 집어 넣고 싶은 데이터를 넣음
    {
      _id: this.id,
      username: this.username,
    },
    process.env.JWT_SECRET, // 두 번째 파라미터에는 JWT 암호
    {
      expiresIn: '7d', // 7일간 유효
    },
  );
  return token;
};

// static 메서드
UserSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};

const User = mongoose.model('User', UserSchema);
export default User;
