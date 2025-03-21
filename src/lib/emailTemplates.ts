import enTemplate from '../email-templates/registration-en.html?raw'
import idTemplate from '../email-templates/registration-id.html?raw'

export function loadEmailTemplate(language: 'en' | 'id'): string {
  console.log('Loading template for language:', language);
  const template = language === 'id' ? idTemplate : enTemplate;
  console.log('Template starts with:', template.substring(0, 100));
  return template;
} 