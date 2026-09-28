# gostones

围棋棋谱复盘台（原生 ES 模块，零依赖）：棋盘居中，底下一条手数条可以拖着回看，左边没有侧栏；落子要过提子、自杀与打劫三道关，两次虚手之后按盘面点目分胜负。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ 即可操作。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js
