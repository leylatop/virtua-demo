export type Message = {
  id: number;
  sender: 'me' | 'assistant';
  content: string;
  createdAt: string;
  imageUrl?: string;
};
