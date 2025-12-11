// Utility functions for mood-related operations

function emojiFor(mood) {
  switch (mood) {
    case 'happy': return '😊';
    case 'excited': return '🤩';
    case 'neutral': return '😐';
    case 'tired': return '🥱';
    case 'anxious': return '😟';
    case 'sad': return '😔';
    case 'angry': return '😠';
    default: return '🙂';
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${m}/${dd}/${y}`;
}

module.exports = {
  emojiFor,
  capitalize,
  formatDate
};
