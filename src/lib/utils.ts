export function formatDateWithLocale(dateString: string, language: string): string {
  const date = new Date(dateString);
  
  if (language === 'id') {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  
  // English format (default)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateWithIntl(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function translateDuration(duration: string, language: string): string {
  if (!duration) return duration;
  
  const [prefix, ...rest] = duration.split(' ');
  const number = rest[0];
  const unit = rest[1];
  
  if (language === 'id') {
    const translatedPrefix = prefix.toLowerCase() === 'maximum' ? 'Maksimal' : 'Minimal';
    const translatedUnit = unit.toLowerCase() === 'minutes' ? 'menit' : unit;
    return `${translatedPrefix} ${number} ${translatedUnit}`;
  }
  
  // English format (default)
  return duration;
} 