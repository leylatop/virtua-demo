import { ChangeEvent, FormEvent, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer, VListHandle } from 'virtua';

import { AutoHideScrollBarContainer } from './AutoHideScrollBarContainer';

type Message = {
  id: number;
  sender: 'me' | 'assistant';
  content: string;
  createdAt: string;
  imageUrl?: string;
};

type ScrollAnchor = {
  index: number;
  isAtBottom: boolean;
};

const MESSAGE_TEXT_LIST = [
  '今天这个列表要模拟真实聊天记录，所以每条消息高度会不一样。',
  '收到，我会保留顶部历史消息区域，底部固定输入框。',
  '短消息。',
  '短消息。',
  '短消息。',
  '短消息。',
  Array.from({ length: 42 }, (_, index) => {
    return `第 ${index + 1} 段：这里是一条很长的聊天消息，用来观察虚拟列表在真实文本内容撑高后的滚动表现。聊天场景里经常会有多行文本、图片和连续消息，所以列表项不能假设固定高度。`;
  }).join('\n\n'),
  '图片也要混在消息里，看看加载后布局是否还能保持正常。',
  '可以，新消息发送后会自动滚动到最新位置。',
];

const IMAGE_LIST = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=640&q=80',
];

function createMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const hasImage = index % 9 === 3;

    return {
      id,
      sender: index % 4 === 0 ? 'me' : 'assistant',
      content: MESSAGE_TEXT_LIST[index % MESSAGE_TEXT_LIST.length],
      createdAt: `${String(9 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
      imageUrl: hasImage ? IMAGE_LIST[index % IMAGE_LIST.length] : undefined,
    };
  });
}

const INITIAL_MESSAGES = createMessages(800);
const INITIAL_SCROLL_MESSAGE_ID = 420;
const BOTTOM_THRESHOLD = 80;
const AUTO_MESSAGE_INTERVAL = 3000;

function findMessageIndexById(messages: Message[], id: Message['id']) {
  return messages.findIndex((message) => {
    return message.id === id;
  });
}

function isNearBottom(list: VListHandle) {
  const distanceToBottom = list.scrollSize - list.viewportSize - list.scrollOffset;

  return distanceToBottom <= BOTTOM_THRESHOLD;
}

function findCenterIndex(list: VListHandle) {
  const centerOffset = list.scrollOffset + list.viewportSize / 2;
  const startIndex = list.findStartIndex();
  const endIndex = list.findEndIndex();

  for (let index = startIndex; index <= endIndex; index += 1) {
    const itemTop = list.getItemOffset(index);
    const itemBottom = itemTop + list.getItemSize(index);

    if (centerOffset >= itemTop && centerOffset <= itemBottom) {
      return index;
    }
  }

  return startIndex;
}

function getScrollAnchor(list: VListHandle): ScrollAnchor {
  return {
    index: findCenterIndex(list),
    isAtBottom: isNearBottom(list),
  };
}

const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
  const messageClassName = message.sender === 'me'
    ? 'message message-me'
    : 'message message-assistant';

  return (
    <article className={messageClassName}>
      <div className="message-bubble">
        <p>{message.content}</p>
        {message.imageUrl ? (
          <img
            alt="聊天图片"
            className="message-image"
            height="180"
            loading="lazy"
            src={message.imageUrl}
            width="320"
          />
        ) : null}
        <time>{message.createdAt}</time>
      </div>
    </article>
  );
});

export function App() {
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<VListHandle>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  // 宽度变化过程中使用的临时锚点，避免连续 resize 时反复改用新的滚动位置。
  const resizeAnchorRef = useRef<ScrollAnchor | null>(null);
  // 最近一次稳定滚动位置的锚点，用于容器宽度变化后恢复原阅读位置。
  const latestScrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const hasInitialScrollRef = useRef(false);
  const previousMessageCountRef = useRef(INITIAL_MESSAGES.length);
  const forceScrollToBottomRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [jumpedMessageId, setJumpedMessageId] = useState<Message['id'] | null>(null);

  const messageRows = useMemo(() => {
    return messages.map((message) => {
      return <ChatMessage key={message.id} message={message} />;
    });
  }, [messages]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = inputValue.trim();

    if (!content) {
      return;
    }

    forceScrollToBottomRef.current = true;
    setMessages((currentMessages) => {
      const nextId = currentMessages.length + 1;
      const now = new Date();

      return [
        ...currentMessages,
        {
          id: nextId,
          sender: 'me',
          content,
          createdAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        },
      ];
    });
    setInputValue('');
  }, [inputValue]);

  const updateBottomState = useCallback(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    const nextIsAtBottom = isNearBottom(list);

    latestScrollAnchorRef.current = getScrollAnchor(list);
    shouldAutoScrollRef.current = nextIsAtBottom;
    setIsAtBottom((currentIsAtBottom) => {
      if (currentIsAtBottom === nextIsAtBottom) {
        return currentIsAtBottom;
      }

      return nextIsAtBottom;
    });
  }, []);

  const handleMessageScroll = useCallback(() => {
    updateBottomState();
  }, [updateBottomState]);

  const scrollToBottom = useCallback(() => {
    if (!messages.length) {
      return;
    }

    listRef.current?.scrollToIndex(messages.length - 1, {
      align: 'end',
    });
    latestScrollAnchorRef.current = {
      index: messages.length - 1,
      isAtBottom: true,
    };
    shouldAutoScrollRef.current = true;
    setIsAtBottom(true);
  }, [messages.length]);

  const restoreScrollAnchor = useCallback((anchor: ScrollAnchor) => {
    if (anchor.isAtBottom) {
      scrollToBottom();

      return;
    }

    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollToIndex(anchor.index, {
      align: 'center',
    });
    window.requestAnimationFrame(() => {
      const currentList = listRef.current;

      if (!currentList) {
        return;
      }

      latestScrollAnchorRef.current = getScrollAnchor(currentList);
      updateBottomState();
    });
  }, [scrollToBottom, updateBottomState]);

  const handleRandomJump = useCallback(() => {
    if (!messages.length) {
      return;
    }

    const targetIndex = Math.floor(Math.random() * messages.length);
    const targetMessage = messages[targetIndex];
    const nextIsAtBottom = targetIndex >= messages.length - 1;

    listRef.current?.scrollToIndex(targetIndex, {
      align: 'center',
    });
    latestScrollAnchorRef.current = {
      index: targetIndex,
      isAtBottom: nextIsAtBottom,
    };
    shouldAutoScrollRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
    setJumpedMessageId(targetMessage.id);
  }, [messages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessages((currentMessages) => {
        const nextId = currentMessages.length + 1;
        const now = new Date();

        return [
          ...currentMessages,
          {
            id: nextId,
            sender: 'assistant',
            content: `自动消息 ${nextId}：这是一条每 3 秒追加到底部的消息，用来测试当前不在底部时是否保持阅读位置。`,
            createdAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          },
        ];
      });
    }, AUTO_MESSAGE_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    let previousWidth = panel.getBoundingClientRect().width;
    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;

      if (!nextWidth || nextWidth === previousWidth) {
        return;
      }

      const anchor = resizeAnchorRef.current ?? latestScrollAnchorRef.current;

      previousWidth = nextWidth;
      resizeAnchorRef.current = anchor;

      if (!anchor) {
        return;
      }

      window.requestAnimationFrame(() => {
        const currentAnchor = resizeAnchorRef.current;

        if (!currentAnchor) {
          return;
        }

        restoreScrollAnchor(currentAnchor);
        resizeAnchorRef.current = null;
      });
    });

    resizeObserver.observe(panel);

    return () => {
      resizeObserver.disconnect();
    };
  }, [restoreScrollAnchor]);

  useLayoutEffect(() => {
    if (!hasInitialScrollRef.current) {
      const initialMessageIndex = findMessageIndexById(messages, INITIAL_SCROLL_MESSAGE_ID);

      hasInitialScrollRef.current = true;
      const isAtBottom = initialMessageIndex >= messages.length - 1;

      shouldAutoScrollRef.current = isAtBottom;
      setIsAtBottom(isAtBottom);

      if (initialMessageIndex >= 0) {
        listRef.current?.scrollToIndex(initialMessageIndex, {
          align: 'center',
        });
        latestScrollAnchorRef.current = {
          index: initialMessageIndex,
          isAtBottom,
        };
      }

      return;
    }

    const previousMessageCount = previousMessageCountRef.current;
    const hasNewMessage = messages.length > previousMessageCount;

    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage) {
      forceScrollToBottomRef.current = false;

      return;
    }

    if (!forceScrollToBottomRef.current && !shouldAutoScrollRef.current) {
      forceScrollToBottomRef.current = false;

      return;
    }

    forceScrollToBottomRef.current = false;
    scrollToBottom();
    setIsAtBottom(true);
  }, [messages.length, scrollToBottom]);

  return (
    <main className="app">
      <section ref={panelRef} className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>聊天记录</h1>
            <p>
              {messages.length.toLocaleString()} 条历史消息，初始化定位到 #{INITIAL_SCROLL_MESSAGE_ID}
              {jumpedMessageId ? `，刚刚跳转到 #${jumpedMessageId}` : ''}
            </p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={handleRandomJump}>
              随机跳转
            </button>
            <span>virtua</span>
          </div>
        </header>

        <AutoHideScrollBarContainer ref={listScrollRef} className="message-list">
          <Virtualizer
            ref={listRef}
            overscan={8}
            scrollRef={listScrollRef}
            onScroll={handleMessageScroll}
          >
            {messageRows}
          </Virtualizer>
        </AutoHideScrollBarContainer>

        {!isAtBottom ? (
          <button
            className="scroll-bottom-button"
            type="button"
            onClick={scrollToBottom}
          >
            到底部
          </button>
        ) : null}

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            aria-label="输入新消息"
            placeholder="输入新消息..."
            rows={1}
            value={inputValue}
            onChange={handleInputChange}
          />
          <button type="submit">发送</button>
        </form>
      </section>
    </main>
  );
}
