# Node/Express 部署说明

这个项目已经整理成一个标准的 Node/Express Web Service：

- `server/index.mjs` 是服务入口。
- `npm start` 会启动 Express 服务。
- Express 提供 `/api/*` 后端接口。
- `npm run build` 会把前端运行需要的文件生成到 `dist/`。
- Express 优先托管 `dist/`，本地没有 `dist/` 时会回退托管项目根目录里的前端文件。
- 前端使用相对路径请求 API，所以前端和后端应部署在同一个服务里。

不要把它当成纯静态站部署到 OSS、GitHub Pages 或只支持静态文件的平台。

## 上线前检查

在本地项目目录执行：

```bash
npm ci
npm run build
npm test
npm start
```

启动后打开：

```text
http://localhost:3000/api/health
```

正常应返回类似：

```json
{
  "ok": true,
  "name": "didi-proxy-argue-backend",
  "demoMode": false,
  "aiConfigured": true,
  "model": "deepseek-chat"
}
```

其中：

- `ok: true` 表示服务正常。
- `demoMode: false` 表示正式模式。
- `aiConfigured: true` 表示已经配置 AI Key。
- `model` 是当前使用的模型名。

## 必填环境变量

正式上线至少配置下面一组。

推荐使用 DeepSeek：

```env
DEMO_MODE=false
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_MODEL=deepseek-chat
```

或者使用 OpenAI：

```env
DEMO_MODE=false
OPENAI_API_KEY=你的 OpenAI Key
OPENAI_MODEL=gpt-4.1-mini
```

可选变量：

```env
PORT=3000
DEEPSEEK_BASE_URL=https://api.deepseek.com
OPENAI_BASE_URL=
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_VERIFICATION_TOKEN=
FEISHU_ENCRYPT_KEY=
```

注意：真实 `.env` 不要提交到 Git 仓库。仓库里只保留 `.env.example`。

## 通用 Node 平台部署

适用于 Render、Railway、Fly.io、Zeabur、Heroku 类平台，以及支持 Node Web Service 的云平台。

平台配置填写：

```text
Runtime: Node
Node version: 20
Build command: npm ci && npm run build
Start command: npm start
Health check path: /api/health
```

端口不用手动写死。代码会读取平台注入的 `PORT`：

```js
process.env.PORT
```

## Render 部署

仓库已提供 `render.yaml`。你可以直接在 Render 里选择 Blueprint 部署，或手动创建 Web Service。

手动创建时填写：

```text
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/health
```

然后在 Environment Variables 里添加：

```env
DEMO_MODE=false
DEEPSEEK_API_KEY=你的真实 Key
DEEPSEEK_MODEL=deepseek-chat
```

## Railway 部署

Railway 会自动识别 Node 项目。

推荐配置：

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

然后在 Variables 里添加：

```env
DEMO_MODE=false
DEEPSEEK_API_KEY=你的真实 Key
DEEPSEEK_MODEL=deepseek-chat
```

部署完成后访问 Railway 给你的域名，并检查：

```text
https://你的域名/api/health
```

## 云服务器 / 宝塔 / VPS 部署

服务器需要安装 Node.js 20 和 npm。

进入项目目录后执行：

```bash
npm ci
npm run build
npm test
npm start
```

生产环境建议使用 PM2：

```bash
npm install -g pm2
pm2 start server/index.mjs --name didi-proxy-argue
pm2 save
pm2 startup
```

如果使用 Nginx 绑定域名，反代到本地 Node 服务：

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS 可以用宝塔面板申请证书，或用 Certbot 配置。

## 不推荐的部署方式

不推荐只部署到静态平台，例如：

- GitHub Pages
- 纯 OSS 静态网站
- 只上传 `index.html` 的静态托管

原因是项目依赖 Express API：`/api/temp-chat`、`/api/persona/reply`、`/api/training/reply` 等接口必须由 Node 服务运行。

## 部署后验收

上线后检查三件事：

1. 打开首页，确认页面能正常加载。
2. 打开 `/api/health`，确认 `ok` 和 `aiConfigured` 都是 `true`。
3. 在页面里触发一次 AI 生成功能，确认接口不是 500，也没有提示缺少 API Key。
