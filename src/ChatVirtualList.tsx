import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer, VListHandle } from 'virtua';

import { AutoHideScrollBarContainer } from './AutoHideScrollBarContainer';
import { ChatMessage } from './ChatMessage';
import { Message } from './types';

type ScrollAnchor = {
  index: number;
  isAtBottom: boolean;
};

type ChatVirtualListProps = {
  messages: Message[];
  initialScrollMessageId: Message['id'];
};

export type ChatVirtualListHandle = {
  markForceScrollToBottom: () => void;
  scrollToBottom: () => void;
  scrollToRandomMessage: () => Message['id'] | null;
};

const BOTTOM_THRESHOLD = 80;

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

export const ChatVirtualList = forwardRef<ChatVirtualListHandle, ChatVirtualListProps>(
  ({ messages, initialScrollMessageId }, ref) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<VListHandle>(null);
    const listScrollRef = useRef<HTMLDivElement>(null);
    // 宽度变化过程中使用的临时锚点，避免连续 resize 时反复改用新的滚动位置。
    const resizeAnchorRef = useRef<ScrollAnchor | null>(null);
    // 最近一次稳定滚动位置的锚点，用于容器宽度变化后恢复原阅读位置。
    const latestScrollAnchorRef = useRef<ScrollAnchor | null>(null);
    const hasInitialScrollRef = useRef(false);
    const previousMessageCountRef = useRef(messages.length);
    const forceScrollToBottomRef = useRef(false);
    const shouldAutoScrollRef = useRef(true);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isScrollContainerReady, setIsScrollContainerReady] = useState(false);

    const messageRows = useMemo(() => {
      return messages.map((message) => {
        return <ChatMessage key={message.id} message={message} />;
      });
    }, [messages]);

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

    const scrollToMessageIndex = useCallback((index: number, align: 'start' | 'center' | 'end') => {
      listRef.current?.scrollToIndex(index, {
        align,
      });
    }, []);

    const updateScrollContainerReady = useCallback(() => {
      const element = listScrollRef.current;

      setIsScrollContainerReady(Boolean(element?.clientHeight));
    }, []);

    const restoreScrollAnchor = useCallback((anchor: ScrollAnchor) => {
      if (anchor.isAtBottom) {
        scrollToBottom();

        return;
      }

      scrollToMessageIndex(anchor.index, 'center');
      window.requestAnimationFrame(() => {
        const currentList = listRef.current;

        if (!currentList) {
          return;
        }

        latestScrollAnchorRef.current = getScrollAnchor(currentList);
        updateBottomState();
      });
    }, [scrollToBottom, scrollToMessageIndex, updateBottomState]);

    const scrollToRandomMessage = useCallback(() => {
      if (!messages.length) {
        return null;
      }

      const targetIndex = Math.floor(Math.random() * messages.length);
      const targetMessage = messages[targetIndex];
      const nextIsAtBottom = targetIndex >= messages.length - 1;

      scrollToMessageIndex(targetIndex, 'center');
      latestScrollAnchorRef.current = {
        index: targetIndex,
        isAtBottom: nextIsAtBottom,
      };
      shouldAutoScrollRef.current = nextIsAtBottom;
      setIsAtBottom(nextIsAtBottom);

      return targetMessage.id;
    }, [messages, scrollToMessageIndex]);

    useImperativeHandle(ref, () => {
      return {
        markForceScrollToBottom() {
          forceScrollToBottomRef.current = true;
        },
        scrollToBottom,
        scrollToRandomMessage,
      };
    }, [scrollToBottom, scrollToRandomMessage]);

    useEffect(() => {
      const element = listScrollRef.current;

      if (!element) {
        return;
      }

      updateScrollContainerReady();

      const resizeObserver = new ResizeObserver(() => {
        updateScrollContainerReady();
      });

      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
      };
    }, [updateScrollContainerReady]);

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
      if (!isScrollContainerReady || hasInitialScrollRef.current) {
        return;
      }

      const initialMessageIndex = findMessageIndexById(messages, initialScrollMessageId);

      hasInitialScrollRef.current = true;
      const nextIsAtBottom = initialMessageIndex >= messages.length - 1;

      shouldAutoScrollRef.current = nextIsAtBottom;
      setIsAtBottom(nextIsAtBottom);

      if (initialMessageIndex >= 0) {
        scrollToMessageIndex(initialMessageIndex, 'center');
        latestScrollAnchorRef.current = {
          index: initialMessageIndex,
          isAtBottom: nextIsAtBottom,
        };
      }
    }, [initialScrollMessageId, isScrollContainerReady, messages, scrollToMessageIndex]);

    useLayoutEffect(() => {
      if (!hasInitialScrollRef.current) {
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
      <div ref={panelRef} className="chat-list-panel">
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
      </div>
    );
  },
);

ChatVirtualList.displayName = 'ChatVirtualList';
