// utils/clipboard.ts

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert("Output copied to clipboard!");
};
