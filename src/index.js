// 이 파일에서만 Eslint 옵션 중 no global 비활성화
/* eslint-disable no-global-assign */
require = require('esm')(module /*, options*/);
module.export = require('./main.js');
