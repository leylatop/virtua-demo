# virtua-demo

一个基于 Vite、React 和 virtua 的聊天虚拟列表示例项目，用来验证大量聊天消息、动态高度消息、图片消息、自动追加消息和滚动位置保持等场景。

## 功能特性

- 使用 `virtua` 渲染大量聊天消息，降低长列表渲染压力
- 支持不同高度的消息内容，包括多行文本和图片消息
- 页面初始化后定位到指定消息
- 支持随机跳转到列表中的消息
- 位于底部时，新消息追加后自动滚动到底部
- 不在底部阅读历史消息时，新消息追加后保持当前阅读位置
- 容器宽度变化后，根据滚动锚点恢复原阅读位置
- 滚动条默认隐藏，鼠标移入列表区域后显示

## 技术栈

- React 19
- TypeScript
- Vite 7
- virtua
- clsx

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 目录结构

```text
src
├── App.tsx
├── AutoHideScrollBarContainer.tsx
├── ChatComposer.tsx
├── ChatMessage.tsx
├── ChatVirtualList.tsx
├── ChatVirtualListBase
│   └── index.tsx
├── main.tsx
├── messageData.ts
├── styles.css
└── types.ts
```

## 核心模块

### `App.tsx`

负责维护消息数据、发送消息、自动追加消息，以及调用聊天列表暴露的滚动方法。

### `ChatVirtualList.tsx`

聊天列表的业务封装层，主要处理：

- 初始滚动定位
- 底部状态判断
- 新消息自动滚动
- 随机消息跳转
- 宽度变化后的滚动位置恢复

### `ChatVirtualListBase/index.tsx`

虚拟列表基础组件，封装 `virtua` 的 `Virtualizer`，并向上暴露滚动控制方法：

- `getAnchor`
- `getIsAtBottom`
- `scrollToBottom`
- `scrollToIndex`

### `AutoHideScrollBarContainer.tsx`

滚动容器组件，用于实现默认隐藏滚动条、鼠标移入后显示滚动条。

### `messageData.ts`

生成 Demo 使用的聊天消息数据，包含普通文本、长文本和图片消息。

## 示例行为

项目启动后会生成 800 条初始消息，并默认定位到第 420 条消息。页面每 3 秒自动追加一条消息：

- 如果当前列表在底部，会自动滚动到最新消息
- 如果正在查看历史消息，不会强制跳到底部

点击右上角的「随机跳转」按钮，可以跳转到随机消息位置。

## 开发说明

当前项目主要用于验证聊天场景下的虚拟列表滚动行为。修改滚动逻辑时，需要重点检查以下场景：

- 初始定位是否准确
- 发送消息后是否滚动到底部
- 查看历史消息时，新消息是否不会打断阅读位置
- 图片加载和长文本消息是否会影响滚动位置
- 容器宽度变化后，阅读位置是否保持稳定
