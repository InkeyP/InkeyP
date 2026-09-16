# Profile header

`profile-light.svg` 和 `profile-dark.svg` 是自包含的静态横幅，使用博客现有的壁纸、头像和 Chillax。保留原 README 打字动画中的五句文字，改为同时展示。图片内嵌，英文转为路径，emoji 使用系统字体；无外部字体、脚本或图片请求。

源素材来自个人博客 `public/img/` 和 `public/fonts/chillax/`。沿用原素材与字体的授权，不另行声明为本仓库原创。

修改横幅布局后，在已安装 Python `fonttools[woff]` 的环境重新生成：

```powershell
python scripts/build-profile.py F:/OneDrive/Astro
```

脚本只读取博客目录。README 通过 `<picture>` 按明暗偏好选择横幅及统计卡片；不支持时使用浅色版。原版介绍、博客入口、GitHub Stats、Top Languages、贪吃蛇、Activity Graph、五项技术徽章、访客统计与顺序均保留。

## 统计卡片

`cards/` 保存 GitHub Stats、Top Languages 和最近 31 天 Activity Graph 的明暗两套 SVG。README 直接引用这些文件，不再请求已暂停的 Vercel 图片服务。

- Stats 和 Top Languages 使用原项目继任者 [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended) 的官方渲染包，版本锁定在 `package-lock.json`。
- `update-cards-compat.mjs` 为 2.1.3 版本应用窄范围兼容补丁：使用公开的 `stargazerCount` 计数，避开 GitHub 已限制的 stargazer 用户列表查询，不需要扩大令牌权限。
- Activity Graph 使用 GitHub GraphQL 返回的每日贡献数绘制，无模拟数据。
- `.github/workflows/cards.yml` 每天 06:23 UTC 更新，也支持手动触发。所有数据获取和渲染均成功后才提交；API 错误或限流不会覆盖已有图片。
- Actions 默认使用仓库的 `GITHUB_TOKEN`，统计范围由该令牌可访问的数据决定。无需新增 PAT。本地运行使用已登录的 `gh` 凭据；凭据只在进程内使用，不写入文件。
- 贪吃蛇继续使用原来的 `snake.yml`；徽章和访客计数保留原来的服务。

本地更新（Node.js 24、已登录的 GitHub CLI）：

```powershell
npm ci --ignore-scripts
npm test
npm run update:cards
```

统计 SVG 已随仓库保存，克隆后即可显示；定时更新需将工作流推送到 GitHub 后生效。
