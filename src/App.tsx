import { useCallback, useEffect, useRef, useState } from 'react';

import { ChatComposer } from './ChatComposer';
import { ChatVirtualList, ChatVirtualListHandle } from './ChatVirtualList';
import { createMessages } from './messageData';
import { Message } from './types';

const INITIAL_MESSAGES = createMessages(800);
const INITIAL_SCROLL_MESSAGE_ID = 420;
const AUTO_MESSAGE_INTERVAL = 3000;

function createCurrentTime() {
  const now = new Date();

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function App() {
  const listRef = useRef<ChatVirtualListHandle>(null);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [jumpedMessageId, setJumpedMessageId] = useState<Message['id'] | null>(null);

  const handleSend = useCallback((content: string) => {
    listRef.current?.markForceScrollToBottom();
    setMessages((currentMessages) => {
      const nextId = currentMessages.length + 1;

      return [
        ...currentMessages,
        {
          id: nextId,
          sender: 'me',
          content,
          createdAt: createCurrentTime(),
        },
      ];
    });
  }, []);

  const handleRandomJump = useCallback(() => {
    const targetMessageId = listRef.current?.scrollToRandomMessage() ?? null;

    setJumpedMessageId(targetMessageId);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessages((currentMessages) => {
        const nextId = currentMessages.length + 1;

        return [
          ...currentMessages,
          {
            id: nextId,
            sender: 'assistant',
            content: `自动消息 ${nextId}：这是一条每 3 秒追加到底部的消息，用来测试当前不在底部时是否保持阅读位置。`,
            createdAt: createCurrentTime(),
          },
        ];
      });
    }, AUTO_MESSAGE_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="app">
      <section className="chat-panel">
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

        <ChatVirtualList
          ref={listRef}
          messages={messages}
          initialScrollMessageId={INITIAL_SCROLL_MESSAGE_ID}
        />

        <ChatComposer onSend={handleSend} />
      </section>
    </main>
  );
}
