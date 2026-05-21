export function insertTextAtCursor({
  currentValue,
  insertText,
  textArea,
}: {
  currentValue: string;
  insertText: string;
  textArea: HTMLTextAreaElement | null;
}) {
  if (!textArea) {
    return `${currentValue}${insertText}`;
  }

  const selectionStart = textArea.selectionStart;
  const selectionEnd = textArea.selectionEnd;
  const nextValue = `${currentValue.slice(0, selectionStart)}${insertText}${currentValue.slice(selectionEnd)}`;
  const nextCursorPosition = selectionStart + insertText.length;

  window.requestAnimationFrame(() => {
    textArea.focus();
    textArea.setSelectionRange(nextCursorPosition, nextCursorPosition);
  });

  return nextValue;
}
