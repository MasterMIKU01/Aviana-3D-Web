# VoxelCAUC - Website Rewrite

本仓库现已整理为纯网站版本（Vite + Three.js），保留以下核心能力：

- 首页建筑卡片浏览（校园 / 关于切换）
- 3D 模型查看（Three.js + GLTFLoader + DRACOLoader + OrbitControls）
- 建筑作者与说明信息面板
- 引导页覆盖层与移动端适配

## 项目结构

- 网站工程：web

## 运行网站版

1. 进入网站目录

```bash
cd web
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 打包

```bash
npm run build
```

## 服务器静态资源方案（不使用 cloud://）

网页版默认按“网站同源静态文件”读取资源。

- 规则：`cloud://env-id/path/to/file.ext` 会自动转换为 `/assets/path/to/file.ext`
- 示例：
	- `cloud://xxx/cards/主教学楼.webp` -> `/assets/cards/%E4%B8%BB%E6%95%99%E5%AD%A6%E6%A5%BC.webp`
	- `cloud://xxx/models/zhu_jiao_xue_lou.glb` -> `/assets/models/zhu_jiao_xue_lou.glb`

部署时请将图片与模型放到网站静态目录（建议）：

- `web/public/assets/cards/`
- `web/public/assets/models/`

如果某个资源路径需要单独重写，可在 `web/src/config/cloudFileMap.js` 增加覆盖映射。

## 许可证

项目沿用仓库现有许可证：CC BY-NC 4.0。