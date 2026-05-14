import { ChangeEvent, FormEvent, useCallback, useState } from 'react';

type ChatComposerProps = {
  onSend: (content: string) => void;
};

export function ChatComposer({ onSend }: ChatComposerProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = inputValue.trim();

    if (!content) {
      return;
    }

    onSend(content);
    setInputValue('');
  }, [inputValue, onSend]);

  return (
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
  );
}
