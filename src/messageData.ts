import { Message } from './types';

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

export function createMessages(count: number): Message[] {
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
