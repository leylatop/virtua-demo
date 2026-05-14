import { memo } from 'react';

import { Message } from './types';

export const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
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
